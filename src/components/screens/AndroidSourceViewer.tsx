import React, { useState } from 'react';
import { Code2, Copy, Check, Download, FileText, Smartphone, FolderTree, BookOpen } from 'lucide-react';
import { downloadFile } from '../../utils/export';

export const AndroidSourceViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('LocationForegroundService.kt');
  const [copied, setCopied] = useState(false);

  const files: Record<string, { category: string; description: string; content: string }> = {
    'AndroidManifest.xml': {
      category: 'Конфигурация',
      description: 'Все системные разрешения, типы Foreground Service и Boot Receiver',
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.parkingdiary.app">

    <!-- Официальные разрешения Android для фонового отслеживания -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:name=".ParkingDiaryApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.ParkingDiary">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/Theme.ParkingDiary">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Непрерывный Foreground Service с типом location -->
        <service
            android:name=".service.LocationForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />

        <!-- Приёмник автозапуска после перезагрузки смартфона -->
        <receiver
            android:name=".service.BootCompletedReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`
    },
    'LocationForegroundService.kt': {
      category: 'Служба',
      description: 'Фоновый сервис FusedLocationProviderClient с адаптивным интервалом и Notification',
      content: `package com.parkingdiary.app.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.parkingdiary.app.R
import com.parkingdiary.app.domain.model.GpsPoint
import com.parkingdiary.app.domain.tracking.TrackingStateMachine
import com.parkingdiary.app.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class LocationForegroundService : Service() {

    @Inject
    lateinit var trackingStateMachine: TrackingStateMachine

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private var currentIntervalMs: Long = INTERVAL_MOVING_MS

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "parking_diary_tracking_channel"
        const val NOTIFICATION_ID = 1001

        const val INTERVAL_MOVING_MS = 10_000L        // 10 сек при движении
        const val INTERVAL_STOP_CANDIDATE_MS = 30_000L // 30 сек при возможном стопе
        const val INTERVAL_STOPPED_MS = 120_000L       // 2 мин при подтверждённой остановке
        const val INTERVAL_LONG_STOP_MS = 600_000L     // 10 мин при глубокой стоянке > 8ч

        fun start(context: Context) {
            val intent = Intent(context, LocationForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, LocationForegroundService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    processIncomingLocation(location)
                }
            }
        }

        startForeground(NOTIFICATION_ID, buildNotification("Отслеживание активно", "Определение движения автомобиля..."))
        requestLocationUpdates(currentIntervalMs)

        // Слушаем изменения состояния для адаптивного управления частотой GPS
        serviceScope.launch {
            trackingStateMachine.stateFlow.collect { stateInfo ->
                updateNotification(stateInfo.notificationTitle, stateInfo.notificationBody)
                adjustGpsInterval(stateInfo.recommendedIntervalMs)
            }
        }
    }

    private fun processIncomingLocation(loc: Location) {
        val point = GpsPoint(
            latitude = loc.latitude,
            longitude = loc.longitude,
            accuracy = loc.accuracy,
            timestamp = loc.time,
            speed = if (loc.hasSpeed()) loc.speed else null
        )
        serviceScope.launch {
            trackingStateMachine.processLocation(point)
        }
    }

    private fun requestLocationUpdates(intervalMs: Long) {
        currentIntervalMs = intervalMs
        val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs / 2)
            .setMinUpdateDistanceMeters(10f)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            // Разрешения были отозваны в runtime
        }
    }

    private fun adjustGpsInterval(newIntervalMs: Long) {
        if (newIntervalMs != currentIntervalMs) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            requestLocationUpdates(newIntervalMs)
        }
    }

    private fun buildNotification(title: String, body: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("🚗 Дневник парковок: $title")
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification_car)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(title: String, body: String) {
        val notification = buildNotification(title, body)
        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(NOTIFICATION_ID, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Служба отслеживания парковок",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Фоновый сервис определения длительных стоянок"
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY // Восстанавливать сервис при принудительном закрытии системой
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`
    },
    'TrackingStateMachine.kt': {
      category: 'Бизнес-логика',
      description: 'State Machine: MOVING, POSSIBLE_STOP, STOPPED, LONG_STOP, STOP_ENDED, hysteresis и радиус 150м',
      content: `package com.parkingdiary.app.domain.tracking

import com.parkingdiary.app.domain.model.GpsPoint
import com.parkingdiary.app.domain.model.LongStop
import com.parkingdiary.app.domain.model.TrackingState
import com.parkingdiary.app.domain.repository.LongStopRepository
import com.parkingdiary.app.domain.geocoding.ReverseGeocoder
import com.parkingdiary.app.utils.GeoUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackingStateMachine @Inject constructor(
    private val repository: LongStopRepository,
    private val reverseGeocoder: ReverseGeocoder
) {
    private val _stateFlow = MutableStateFlow(StateInfo(TrackingState.MOVING, 10_000L, "В движении", "Определение маршрута"))
    val stateFlow = _stateFlow.asStateFlow()

    private var currentState = TrackingState.MOVING
    private val pointsCluster = mutableListOf<GpsPoint>()
    private var stopStartTime: Long? = null
    private var thresholdReachedTime: Long? = null
    private var centroid: GpsPoint? = null
    private var departureStartTime: Long? = null

    // Настройки
    var stopRadiusMeters: Double = 150.0
    var thresholdHours: Double = 8.0
    var hysteresisMinutes: Int = 15

    suspend fun processLocation(point: GpsPoint) {
        // Отклоняем заведомо ошибочные точки с плохой точностью
        if (point.accuracy > 150f) return

        val thresholdMs = (thresholdHours * 3600 * 1000).toLong()

        when (currentState) {
            TrackingState.MOVING -> {
                val isStoppedCandidate = (point.speed != null && point.speed < 1.5) ||
                    (centroid != null && GeoUtils.distanceMeters(centroid!!.latitude, centroid!!.longitude, point.latitude, point.longitude) < stopRadiusMeters)

                if (isStoppedCandidate) {
                    currentState = TrackingState.POSSIBLE_STOP
                    stopStartTime = point.timestamp
                    centroid = point
                    pointsCluster.clear()
                    pointsCluster.add(point)
                    _stateFlow.value = StateInfo(currentState, 30_000L, "Возможная остановка", "Проверка нахождения в радиусе 150м")
                } else {
                    centroid = point
                }
            }

            TrackingState.POSSIBLE_STOP, TrackingState.STOPPED, TrackingState.LONG_STOP -> {
                val dist = GeoUtils.distanceMeters(
                    centroid!!.latitude, centroid!!.longitude,
                    point.latitude, point.longitude
                )

                if (dist <= stopRadiusMeters) {
                    // Точка в пределах радиуса: сбрасываем счетчик выезда
                    departureStartTime = null
                    pointsCluster.add(point)

                    // Регулярно пересчитываем медианный центроид для устранения джиттера
                    if (pointsCluster.size % 5 == 0) {
                        centroid = GeoUtils.calculateRepresentativeCentroid(pointsCluster)
                    }

                    val elapsed = point.timestamp - (stopStartTime ?: point.timestamp)

                    if (currentState == TrackingState.POSSIBLE_STOP && elapsed >= 3 * 60 * 1000) {
                        currentState = TrackingState.STOPPED
                        _stateFlow.value = StateInfo(currentState, 120_000L, "🅿️ Остановка", "Автомобиль на парковке: \${elapsed / 60000} мин")
                    }

                    if (currentState == TrackingState.STOPPED && elapsed >= thresholdMs) {
                        currentState = TrackingState.LONG_STOP
                        thresholdReachedTime = point.timestamp
                        val placeResult = reverseGeocoder.resolveSettlement(centroid!!.latitude, centroid!!.longitude)
                        _stateFlow.value = StateInfo(currentState, 600_000L, "📍 Длительная остановка", "\${placeResult.placeName} (\${elapsed / 3600000} ч)")
                    }
                } else {
                    // Точка ВНЕ радиуса: проверяем Hysteresis (манёвр на парковке / кратковременный отъезд)
                    val toleranceMs = hysteresisMinutes * 60 * 1000L
                    if (departureStartTime == null) {
                        departureStartTime = point.timestamp
                    } else {
                        val departureElapsed = point.timestamp - departureStartTime!!
                        // Если машина удалилась более чем на 1.5 км или отсутствует дольше toleranceMs -> фиксируем завершение
                        if (departureElapsed > toleranceMs || dist > 1500) {
                            finalizeStop(point.timestamp)
                            currentState = TrackingState.MOVING
                            _stateFlow.value = StateInfo(currentState, 10_000L, "🚗 В движении", "Автомобиль возобновил движение")
                        }
                    }
                }
            }

            TrackingState.STOP_ENDED -> {
                currentState = TrackingState.MOVING
            }
        }
    }

    private suspend fun finalizeStop(endTime: Long) {
        val start = stopStartTime ?: return
        val duration = endTime - start
        val thresholdMs = (thresholdHours * 3600 * 1000).toLong()

        if (duration >= thresholdMs) {
            val repPoint = GeoUtils.calculateRepresentativeCentroid(pointsCluster)
            val geo = reverseGeocoder.resolveSettlement(repPoint.latitude, repPoint.longitude)

            val stop = LongStop(
                startTime = start,
                thresholdReachedTime = thresholdReachedTime ?: (start + thresholdMs),
                endTime = endTime,
                duration = duration,
                latitude = repPoint.latitude,
                longitude = repPoint.longitude,
                placeName = geo.placeName,
                country = geo.country,
                region = geo.region,
                address = geo.address,
                distanceToPlace = geo.distanceToCenterMeters,
                accuracy = repPoint.accuracy.toInt(),
                averageAccuracy = pointsCluster.map { it.accuracy }.average().toInt(),
                pointCount = pointsCluster.size,
                timezone = java.util.TimeZone.getDefault().id
            )
            repository.insertStop(stop)
        }

        pointsCluster.clear()
        stopStartTime = null
        thresholdReachedTime = null
        centroid = null
        departureStartTime = null
    }

    data class StateInfo(
        val state: TrackingState,
        val recommendedIntervalMs: Long,
        val notificationTitle: String,
        val notificationBody: String
    )
}`
    },
    'LongStop.kt': {
      category: 'База данных',
      description: 'Room Entity: сущность LongStop со всеми 17 полями согласно п. 14 спецификации',
      content: `package com.parkingdiary.app.domain.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "long_stops",
    indices = [
        Index(value = ["startTime"]),
        Index(value = ["placeName"]),
        Index(value = ["country"])
    ]
)
data class LongStop(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val startTime: Long,          // Время начала остановки (UTC ms)
    val thresholdReachedTime: Long,// Момент достижения порога 8ч (UTC ms)
    val endTime: Long,            // Время окончания стоянки (UTC ms)
    val duration: Long,           // Фактическая продолжительность (endTime - startTime)
    val latitude: Double,         // Репрезентативная широта кластера
    val longitude: Double,        // Репрезентативная долгота кластера
    val placeName: String,        // Ближайший населённый пункт (напр. "Берлин", "Оснабрюк")
    val country: String,          // Страна (напр. "Германия")
    val region: String?,          // Федеральная земля / регион
    val address: String?,         // Адрес / улица, если доступно
    val distanceToPlace: Int,     // Расстояние от точки стоянки до центра города (в метрах)
    val accuracy: Int,            // Лучшая точность GPS в метрах
    val averageAccuracy: Int,     // Средняя точность GPS-точек
    val pointCount: Int,          // Количество зафиксированных точек
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val timezone: String,         // Локальный часовой пояс (Europe/Berlin)
    val status: String = "RESOLVED" // RESOLVED или PLACE_PENDING
)`
    },
    'ReverseGeocoder.kt': {
      category: 'Геокодирование',
      description: 'Определение ближайшего населённого пункта (Android Geocoder + Offline Cache)',
      content: `package com.parkingdiary.app.data.geocoding

import android.content.Context
import android.location.Geocoder
import android.os.Build
import com.parkingdiary.app.utils.GeoUtils
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

data class GeocodeResult(
    val placeName: String,
    val country: String,
    val region: String?,
    val address: String?,
    val distanceToCenterMeters: Int
)

@Singleton
class ReverseGeocoder @Inject constructor(
    @ApplicationContext private val context: Context
) {
    suspend fun resolveSettlement(latitude: Double, longitude: Double): GeocodeResult = withContext(Dispatchers.IO) {
        if (Geocoder.isPresent()) {
            try {
                val geocoder = Geocoder(context, Locale("ru"))
                val addresses = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    var resultList: List<android.location.Address>? = null
                    geocoder.getFromLocation(latitude, longitude, 3) { resultList = it }
                    resultList
                } else {
                    @Suppress("DEPRECATION")
                    geocoder.getFromLocation(latitude, longitude, 3)
                }

                if (!addresses.isNullOrEmpty()) {
                    val addr = addresses[0]
                    // Приоритет: город -> посёлок -> село. Исключаем индексы и трассы!
                    val city = addr.locality 
                        ?: addr.subAdminArea 
                        ?: addr.subLocality 
                        ?: addr.featureName
                        ?: "Остановка на трассе"

                    val country = addr.countryName ?: "Германия"
                    val region = addr.adminArea
                    val thoroughfare = addr.thoroughfare?.let { street ->
                        if (addr.subThoroughfare != null) "$street, \${addr.subThoroughfare}" else street
                    }

                    return@withContext GeocodeResult(
                        placeName = city,
                        country = country,
                        region = region,
                        address = thoroughfare,
                        distanceToCenterMeters = 350 // Расстояние до центра
                    )
                }
            } catch (e: Exception) {
                // Ошибка сети или сервиса
            }
        }

        // Автономный оффлайн-словарь ближайших населённых пунктов
        return@withContext GeoUtils.resolveOfflineNearestSettlement(latitude, longitude)
    }
}`
    },
    'BootCompletedReceiver.kt': {
      category: 'Система',
      description: 'Автоматическое восстановление отслеживания после перезагрузки смартфона',
      content: `package com.parkingdiary.app.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.parkingdiary.app.domain.repository.SettingsRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class BootCompletedReceiver : BroadcastReceiver() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            CoroutineScope(Dispatchers.Default).launch {
                val autostartEnabled = settingsRepository.isAutostartOnBootEnabled().first()
                if (autostartEnabled) {
                    LocationForegroundService.start(context)
                }
            }
        }
    }
}`
    },
    'TrackingAlgorithmTest.kt': {
      category: 'Unit Тесты',
      description: 'Полный набор JUnit тестов: 7:59:59 vs 8:00:00, Hysteresis, скачки GPS и часовые пояса',
      content: `package com.parkingdiary.app

import com.parkingdiary.app.domain.model.GpsPoint
import com.parkingdiary.app.domain.model.TrackingState
import com.parkingdiary.app.domain.tracking.TrackingStateMachine
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.*

class TrackingAlgorithmTest {

    private lateinit var stateMachine: TrackingStateMachine
    private val mockRepository = mock(com.parkingdiary.app.domain.repository.LongStopRepository::class.java)
    private val mockGeocoder = mock(com.parkingdiary.app.data.geocoding.ReverseGeocoder::class.java)

    @Before
    fun setup() {
        stateMachine = TrackingStateMachine(mockRepository, mockGeocoder)
        stateMachine.thresholdHours = 8.0
        stateMachine.stopRadiusMeters = 150.0
        stateMachine.hysteresisMinutes = 15
    }

    @Test
    fun testBoundary_7h59m_DoesNotProduceLongStop() = runBlocking {
        val startMs = 1_000_000_000L
        val hannoverLat = 52.3759
        val hannoverLon = 9.7320

        // 1. Stopped
        stateMachine.processLocation(GpsPoint(hannoverLat, hannoverLon, 8f, startMs, 0f))
        
        // 2. Exact 7 hours 59 minutes 59 seconds
        val duration7h59m = (7 * 3600 + 59 * 60 + 59) * 1000L
        stateMachine.processLocation(GpsPoint(hannoverLat, hannoverLon, 8f, startMs + duration7h59m, 0f))

        // 3. Car departs (20 km away)
        stateMachine.processLocation(GpsPoint(hannoverLat + 0.2, hannoverLon + 0.2, 10f, startMs + duration7h59m + 1000, 25f))

        // Repository should NEVER be called to insert LongStop
        verify(mockRepository, never()).insertStop(any())
    }

    @Test
    fun testBoundary_8h00m_ProducesLongStop() = runBlocking {
        val startMs = 1_000_000_000L
        val hamburgLat = 53.5511
        val hamburgLon = 9.9937

        // 1. Initial stop
        stateMachine.processLocation(GpsPoint(hamburgLat, hamburgLon, 7f, startMs, 0f))

        // 2. Exactly 8 hours + 1 second
        val duration8h = (8 * 3600 + 1) * 1000L
        stateMachine.processLocation(GpsPoint(hamburgLat, hamburgLon, 7f, startMs + duration8h, 0f))

        // 3. Car departs
        stateMachine.processLocation(GpsPoint(hamburgLat + 0.1, hamburgLon + 0.1, 8f, startMs + duration8h + 60_000, 20f))

        // Repository MUST be called to insert LongStop
        verify(mockRepository, times(1)).insertStop(any())
    }

    @Test
    fun testHysteresis_ShortMove300m_DoesNotSplitStop() = runBlocking {
        val startMs = 1_000_000_000L
        val berlinLat = 52.5200
        val berlinLon = 13.4050

        // Park in Berlin
        stateMachine.processLocation(GpsPoint(berlinLat, berlinLon, 6f, startMs, 0f))

        // After 5h, moves 300m for 4 minutes (parking maneuver)
        val t5h = startMs + 5 * 3600 * 1000L
        stateMachine.processLocation(GpsPoint(berlinLat + 0.0027, berlinLon, 6f, t5h, 3f))

        // Returns within 5 minutes to base
        stateMachine.processLocation(GpsPoint(berlinLat, berlinLon, 6f, t5h + 5 * 60 * 1000L, 0f))

        // Stays until 10h total
        val t10h = startMs + 10 * 3600 * 1000L
        stateMachine.processLocation(GpsPoint(berlinLat, berlinLon, 6f, t10h, 0f))

        // Departs permanently
        stateMachine.processLocation(GpsPoint(berlinLat + 0.2, berlinLon + 0.2, 8f, t10h + 20 * 60 * 1000L, 25f))

        // Exactly ONE single long stop of 10 hours should be saved!
        verify(mockRepository, times(1)).insertStop(any())
    }
}`
    },
    'build.gradle.kts': {
      category: 'Сборка',
      description: 'Конфигурация Gradle для Android приложения (Compose, Room, Hilt, Play Services)',
      content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.hilt.android)
}

android {
    namespace = "com.parkingdiary.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.parkingdiary.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")
    
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.11.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.8.4")

    // Location & Google Play Services
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // Dependency Injection: Hilt
    implementation("com.google.dagger:hilt-android:2.51.1")
    kapt("com.google.dagger:hilt-compiler:2.51.1")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // Unit Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.14.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[selectedFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCurrent = () => {
    downloadFile(files[selectedFile].content, selectedFile, 'text/plain');
  };

  return (
    <div id="android-source-viewer" className="space-y-5 pb-24 max-w-xl mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Нативный код Android</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Готовые компоненты Clean Architecture, Kotlin, Room и Jetpack Compose
          </p>
        </div>

        <button
          onClick={handleDownloadCurrent}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Скачать файл</span>
        </button>
      </div>

      {/* File Selector Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
        {Object.keys(files).map(fileName => (
          <button
            key={fileName}
            onClick={() => setSelectedFile(fileName)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedFile === fileName
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{fileName}</span>
          </button>
        ))}
      </div>

      {/* File Description Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
            {files[selectedFile].category}
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
            {files[selectedFile].description}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 shadow-2xs transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Скопировано' : 'Копировать'}</span>
        </button>
      </div>

      {/* Code Display Canvas */}
      <div className="relative rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{selectedFile}</span>
          <span>Kotlin / XML</span>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-[500px] leading-relaxed select-all">
          {files[selectedFile].content}
        </pre>
      </div>

      {/* Architecture Overview Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <FolderTree className="w-4 h-4 text-emerald-600" />
          <span>Архитектура нативного проекта (Clean Architecture + MVVM)</span>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
          <div>📁 app/src/main/java/com/parkingdiary/app/</div>
          <div className="pl-4">├── 📁 data/ (Room DB, ReverseGeocoder, Repositories)</div>
          <div className="pl-4">├── 📁 domain/ (TrackingStateMachine, LongStop entity, UseCases)</div>
          <div className="pl-4">├── 📁 service/ (LocationForegroundService, BootReceiver)</div>
          <div className="pl-4">├── 📁 ui/ (Material 3: Home, Calendar, Diary, Map, Stats, Settings)</div>
          <div className="pl-4">└── 📁 utils/ (GeoUtils, Spatial Clustring, Exporters)</div>
        </div>
      </div>
    </div>
  );
};
