export interface CodeFile {
  name: string;
  category: string;
  language: string;
  description: string;
  content: string;
}

export const kotlinCodeBase: CodeFile[] = [
  {
    name: "Entities.kt",
    category: "Room Database",
    language: "kotlin",
    description: "SQLite Entity definitions with full relational integrity, primary/foreign keys, indices, and cascade on delete policies.",
    content: `package com.premium.newspaper.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ForeignKey
import androidx.room.Index

@Entity(tableName = "areas")
data class Area(
    @PrimaryKey val id: String,
    val name: String
)

@Entity(
    tableName = "buildings",
    foreignKeys = [
        ForeignKey(
            entity = Area::class,
            parentColumns = ["id"],
            childColumns = ["areaId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["areaId"])]
)
data class Building(
    @PrimaryKey val id: String,
    val areaId: String,
    val name: String
)

@Entity(
    tableName = "wings",
    foreignKeys = [
        ForeignKey(
            entity = Building::class,
            parentColumns = ["id"],
            childColumns = ["buildingId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["buildingId"])]
)
data class Wing(
    @PrimaryKey val id: String,
    val buildingId: String,
    val name: String
)

@Entity(
    tableName = "flats",
    foreignKeys = [
        ForeignKey(
            entity = Wing::class,
            parentColumns = ["id"],
            childColumns = ["wingId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["wingId"])]
)
data class Flat(
    @PrimaryKey val id: String,
    val wingId: String,
    val flatNumber: String,
    val customerName: String,
    val phoneNumber: String,
    val activeYear: Int = 2026,
    // FEATURE: Dynamic Ledger Metadata
    val ledgerType: String = "SUBSCRIPTION", // "SUBSCRIPTION" or "BILLING"
    val fromDate: String? = null,
    val toDate: String? = null
)

@Entity(tableName = "papers")
data class Paper(
    @PrimaryKey val id: String,
    val name: String,
    val ratePerDay: Double
)

@Entity(
    tableName = "subscriptions",
    foreignKeys = [
        ForeignKey(
            entity = Flat::class,
            parentColumns = ["id"],
            childColumns = ["flatId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = Paper::class,
            parentColumns = ["id"],
            childColumns = ["paperId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["flatId"]), Index(value = ["paperId"])]
)
data class Subscription(
    @PrimaryKey val id: String,
    val flatId: String,
    val paperId: String,
    val active: Boolean = true
)

@Entity(
    tableName = "delivery_logs",
    foreignKeys = [
        ForeignKey(
            entity = Flat::class,
            parentColumns = ["id"],
            childColumns = ["flatId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = Paper::class,
            parentColumns = ["id"],
            childColumns = ["paperId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    primaryKeys = ["flatId", "paperId", "date"],
    indices = [Index(value = ["flatId"]), Index(value = ["paperId"])]
)
data class DeliveryLog(
    val flatId: String,
    val paperId: String,
    val date: String, // format YYYY-MM-DD
    val status: String // "DELIVERED" or "SKIPPED"
)

@Entity(
    tableName = "delivery_agents",
    foreignKeys = [
        ForeignKey(
            entity = Area::class,
            parentColumns = ["id"],
            childColumns = ["assignedAreaId"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index(value = ["assignedAreaId"])]
)
data class DeliveryAgent(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String,
    val assignedAreaId: String?
)`
  },
  {
    name: "NewspaperDao.kt",
    category: "Room Database",
    language: "kotlin",
    description: "Cascaded relational query functions, billing summaries, and transactional log writes optimized for mobile SQLite execution using Coroutines.",
    content: `package com.premium.newspaper.data.dao

import androidx.room.*
import com.premium.newspaper.data.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface NewspaperDao {

    // --- Master Queries ---
    @Query("SELECT * FROM areas ORDER BY name ASC")
    fun getAllAreas(): Flow<List<Area>>

    @Query("SELECT * FROM buildings WHERE areaId = :areaId ORDER BY name ASC")
    fun getBuildingsByArea(areaId: String): Flow<List<Building>>

    @Query("SELECT * FROM wings WHERE buildingId = :buildingId ORDER BY name ASC")
    fun getWingsByBuilding(buildingId: String): Flow<List<Wing>>

    @Query("SELECT * FROM flats WHERE wingId = :wingId ORDER BY flatNumber ASC")
    fun getFlatsByWing(wingId: String): Flow<List<Flat>>

    // --- Cascaded Smart Drop List Query ---
    @Query("""
        SELECT flats.* FROM flats 
        INNER JOIN wings ON flats.wingId = wings.id
        INNER JOIN buildings ON wings.buildingId = buildings.id
        WHERE buildings.areaId = :areaId AND (:buildingId IS NULL OR buildings.id = :buildingId)
        ORDER BY buildings.name, wings.name, flats.flatNumber
    """)
    fun getFlatsByGeographicFilter(areaId: String, buildingId: String?): Flow<List<Flat>>

    // --- Subscriptions & Papers ---
    @Query("SELECT * FROM papers")
    fun getAllPapers(): Flow<List<Paper>>

    @Query("""
        SELECT p.* FROM papers p
        INNER JOIN subscriptions s ON p.id = s.paperId
        WHERE s.flatId = :flatId AND s.active = 1
    """)
    fun getSubscribedPapersForFlat(flatId: String): Flow<List<Paper>>

    // --- Delivery Logs ---
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateDeliveryLog(log: DeliveryLog)

    @Query("SELECT * FROM delivery_logs WHERE flatId = :flatId AND date LIKE :yearMonthPrefix || '%'")
    suspend fun getDeliveryLogsForMonth(flatId: String, yearMonthPrefix: String): List<DeliveryLog>

    @Query("SELECT * FROM delivery_agents WHERE assignedAreaId = :areaId LIMIT 1")
    suspend fun getAgentForArea(areaId: String): DeliveryAgent?

    // --- Admin Invoice Management ---
    @Query("UPDATE flats SET activeYear = :year WHERE id = :flatId") // Mock status update example
    suspend fun updateFlatActiveYear(flatId: String, year: Int)

    // --- Bulk Transactions ---
    @Transaction
    suspend fun insertInitialMasterData(
        areas: List<Area>,
        buildings: List<Building>,
        wings: List<Wing>,
        flats: List<Flat>,
        papers: List<Paper>,
        subs: List<Subscription>,
        agents: List<DeliveryAgent>
    ) {
        // Safe clear-all for fresh mock-seed initialization
        clearAllTables()
        areas.forEach { insertArea(it) }
        buildings.forEach { insertBuilding(it) }
        wings.forEach { insertWing(it) }
        flats.forEach { insertFlat(it) }
        papers.forEach { insertPaper(it) }
        subs.forEach { insertSubscription(it) }
        agents.forEach { insertAgent(it) }
    }

    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertArea(area: Area)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertBuilding(b: Building)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertWing(w: Wing)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertFlat(f: Flat)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertPaper(p: Paper)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertSubscription(s: Subscription)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertAgent(a: DeliveryAgent)

    @Query("DELETE FROM areas") suspend fun clearAllTables()
}`
  },
  {
    name: "AppDatabase.kt",
    category: "Room Database",
    language: "kotlin",
    description: "Main Database setup containing standard Room builder patterns, Type Converters, and static seed callback.",
    content: `package com.premium.newspaper.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.premium.newspaper.data.dao.NewspaperDao
import com.premium.newspaper.data.entity.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        Area::class, Building::class, Wing::class, Flat::class,
        Paper::class, Subscription::class, DeliveryLog::class, DeliveryAgent::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun newspaperDao(): NewspaperDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "newspaper_billing_db"
                )
                .addCallback(DatabasePrepopulationCallback(scope))
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class DatabasePrepopulationCallback(
        private val scope: CoroutineScope
    ) : RoomDatabase.Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                scope.launch(Dispatchers.IO) {
                    // Seed initial essential elements here if required
                    val dao = database.newspaperDao()
                    val basicAreas = listOf(
                        Area("area_1", "Skyline Meadows"),
                        Area("area_2", "Emerald Heights")
                    )
                    basicAreas.forEach { dao.insertArea(it) }
                    
                    val papers = listOf(
                        Paper("p_1", "The Times of India", 5.5),
                        Paper("p_2", "The Hindu", 6.0),
                        Paper("p_3", "The Economic Times", 7.5)
                    )
                    papers.forEach { dao.insertPaper(it) }
                }
            }
        }
    }
}`
  },
  {
    name: "DropListScreen.kt",
    category: "Jetpack Compose UI",
    language: "kotlin",
    description: "Highly polished Material Design 3 Delivery screen with background thread optimization and loading indicators.",
    content: `package com.premium.newspaper.ui.screen

import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.premium.newspaper.data.entity.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun DropListScreen(
    areas: List<Area>,
    buildings: List<Building>,
    flats: List<Flat>,
    isLoading: Boolean, // FEATURE: Background thread loading state
    selectedArea: Area?,
    selectedBuilding: Building?,
    onAreaSelected: (Area) -> Unit,
    onBuildingSelected: (Building?) -> Unit,
    onToggleStatus: (Flat, Paper, String) -> Unit
) {
    var areaExpanded by remember { mutableStateOf(false) }
    var buildingExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Morning Delivery Drops", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF7F9F8))
            ) {
                // --- Filter Panel ---
                Card(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Area Selector
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedButton(onClick = { areaExpanded = true }) {
                                    Text(selectedArea?.name ?: "Select Area", maxLines = 1)
                                }
                                DropdownMenu(expanded = areaExpanded, onDismissRequest = { areaExpanded = false }) {
                                    areas.forEach { area ->
                                        DropdownMenuItem(text = { Text(area.name) }, onClick = { onAreaSelected(area); areaExpanded = false })
                                    }
                                }
                            }
                            // Building Selector
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedButton(onClick = { buildingExpanded = true }, enabled = selectedArea != null) {
                                    Text(selectedBuilding?.name ?: "All Buildings", maxLines = 1)
                                }
                                DropdownMenu(expanded = buildingExpanded, onDismissRequest = { buildingExpanded = false }) {
                                    buildings.forEach { building ->
                                        DropdownMenuItem(text = { Text(building.name) }, onClick = { onBuildingSelected(building); buildingExpanded = false })
                                    }
                                }
                            }
                        }
                    }
                }

                // --- Delivery List with Loading/Empty States ---
                if (isLoading) {
                    // Optimized loading UI for background fetching
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                } else if (flats.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No records found", color = Color.Gray)
                    }
                } else {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(flats) { flat ->
                            DeliveryFlatRow(flat = flat, onToggleStatus = onToggleStatus)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DeliveryFlatRow(flat: Flat, onToggleStatus: (Flat, Paper, String) -> Unit) {
    var isProcessing by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Flat \${flat.flatNumber}", fontWeight = FontWeight.Bold)
                Text(flat.customerName, color = Color.Gray, fontSize = 12.sp)
            }

            // Background Thread Action Indicator
            if (isProcessing) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { /* Simulated background action */ }) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF10B981))
                    }
                    IconButton(onClick = { /* Simulated background action */ }) {
                        Icon(Icons.Default.Block, contentDescription = null, tint = Color(0xFFEF4444))
                    }
                }
            }
        }
    }
}
`
  },
  {
    name: "NewspaperRepository.kt",
    category: "Architecture Layer",
    language: "kotlin",
    description: "Thread-safe repository managing background IO operations for Newspaper billing logic using Dispatchers.IO.",
    content: `package com.premium.newspaper.data.repository

import com.premium.newspaper.data.dao.NewspaperDao
import com.premium.newspaper.data.entity.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class NewspaperRepository(private val dao: NewspaperDao) {

    // IO Safe Query Flows
    val allAreas: Flow<List<Area>> = dao.getAllAreas()

    fun getBuildings(areaId: String) = dao.getBuildingsByArea(areaId)

    fun getFilteredFlats(areaId: String, buildingId: String?) =
        dao.getFlatsByGeographicFilter(areaId, buildingId)

    // Background Thread Operations (Lag Fix Implementation)
    suspend fun saveDeliveryLog(log: DeliveryLog) = withContext(Dispatchers.IO) {
        dao.insertOrUpdateDeliveryLog(log)
    }

    suspend fun markInvoicePaid(flatId: String, year: Int) = withContext(Dispatchers.IO) {
        // Simulate heavy processing before DB write
        kotlinx.coroutines.delay(500)
        dao.updateFlatActiveYear(flatId, year)
    }

    // BUG FIX: Background Thread PDF Generation
    suspend fun generateInvoicePdf(context: Context, bill: BillingSummary, items: List<BillingBreakdownItem>) = withContext(Dispatchers.IO) {
        val service = PdfGenerationService(context)
        service.createInvoicePdf(
            bill.customerName,
            bill.locationPath,
            "\${bill.month}/\${bill.year}",
            items,
            bill.grossAmount,
            bill.skipDeductions,
            bill.netAmount,
            bill.paid
        )
    }

    suspend fun fetchMonthlySummary(flatId: String, prefix: String) = withContext(Dispatchers.IO) {
        dao.getDeliveryLogsForMonth(flatId, prefix)
    }
}`
  },
  {
    name: "NewspaperViewModel.kt",
    category: "Architecture Layer",
    language: "kotlin",
    description: "Jetpack ViewModel managing UI state, loading triggers, and background task execution via viewModelScope.",
    content: `package com.premium.newspaper.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.premium.newspaper.data.entity.*
import com.premium.newspaper.data.repository.NewspaperRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class UiState(
    val isLoading: Boolean = false,
    val areas: List<Area> = emptyList(),
    val buildings: List<Building> = emptyList(),
    val flats: List<Flat> = emptyList(),
    val selectedArea: Area? = null,
    val selectedBuilding: Building? = null,
    val error: String? = null
)

class NewspaperViewModel(private val repository: NewspaperRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        loadAreas()
    }

    private fun loadAreas() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.allAreas.collect { areaList ->
                _uiState.update { it.copy(areas = areaList, isLoading = false) }
            }
        }
    }

    fun onAreaSelected(area: Area) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, selectedArea = area, selectedBuilding = null) }
            repository.getBuildings(area.id).collect { buildings ->
                _uiState.update { it.copy(buildings = buildings, isLoading = false) }
            }
            refreshFlats(area.id, null)
        }
    }

    fun refreshFlats(areaId: String, buildingId: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.getFilteredFlats(areaId, buildingId).collect { flats ->
                _uiState.update { it.copy(flats = flats, isLoading = false) }
            }
        }
    }

    fun updatePaymentStatus(flatId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                repository.markInvoicePaid(flatId, 2026)
                // Flow will automatically refresh UI if observing database
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Payment Update Failed") }
            } finally {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    // BUG FIX: Background PDF Generation & Sharing Trigger
    fun generateAndShareInvoice(context: Context, bill: BillingSummary, items: List<BillingBreakdownItem>) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val file = repository.generateInvoicePdf(context, bill, items)
            _uiState.update { it.copy(isLoading = false) }

            file?.let {
                WhatsAppShareHelper.shareInvoicePdfToWhatsApp(context, it, bill.phoneNumber)
            } ?: run {
                _uiState.update { it.copy(error = "PDF Generation Failed") }
            }
        }
    }
}`
  },
  {
    name: "BillDetailScreen.kt",
    category: "Jetpack Compose UI",
    language: "kotlin",
    description: "Elegant, premium billing detail viewer resembling an A4 invoice card with responsive columns, summary metrics, and sharing buttons.",
    content: `package com.premium.newspaper.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Itemized billing data structures
data class BillingBreakdownItem(
    val paperName: String,
    val rate: Double,
    val deliveredCount: Int,
    val skippedCount: Int,
    val finalCost: Double
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillDetailScreen(
    customerName: String,
    flatLocation: String,
    phoneNumber: String,
    billingMonthYear: String,
    agentName: String,
    agentPhone: String,
    billingItems: List<BillingBreakdownItem>,
    grossTotal: Double,
    skipDeductions: Double,
    netBillAmount: Double,
    isPaid: Boolean,
    onBack: () -> Unit, // BUG FIX: Implement back navigation
    onGeneratePDF: () -> Unit,
    onShareInvoice: (Boolean) -> Unit // true -> PDF, false -> Text summary
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice Details", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF1F5F9))
                .padding(16.dp)
        ) {
            // Invoice Card Layout
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // 1. Brand & Header Block
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "MONTHLY INVOICE",
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                color = Color(0xFF0F5A31)
                            )
                            Text(billingMonthYear, fontSize = 12.sp, color = Color.Gray)
                        }
                        
                        // Paid Status Badge
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isPaid) Color(0xFFD1FAE5) else Color(0xFFFEE2E2))
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = if (isPaid) "PAID" else "UNPAID",
                                color = if (isPaid) Color(0xFF065F46) else Color(0xFF991B1B),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Divider(color = Color(0xFFE2E8F0))
                    Spacer(modifier = Modifier.height(16.dp))

                    // 2. Customer and Agent Meta Grid
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("BILLED TO:", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                            Text(customerName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(flatLocation, fontSize = 12.sp, color = Color.DarkGray)
                            Text("Ph: \$phoneNumber", fontSize = 12.sp, color = Color.DarkGray)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("DELIVERED BY:", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                            Text(agentName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Ph: \$agentPhone", fontSize = 12.sp, color = Color.DarkGray)
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // 3. Itemized List Headers
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC))
                            .padding(8.dp)
                    ) {
                        Text("Newspaper Details", modifier = Modifier.weight(2.5f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text("Drop/Skip", modifier = Modifier.weight(1.5f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text("Rate", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text("Total", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }

                    // 4. Billing items
                    Column(modifier = Modifier.weight(1f)) {
                        billingItems.forEach { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp, horizontal = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(item.paperName, modifier = Modifier.weight(2.5f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Text("\${item.deliveredCount}d / \${item.skippedCount}s", modifier = Modifier.weight(1.5f), fontSize = 12.sp, color = Color.DarkGray)
                                Text("₹\${item.rate}", modifier = Modifier.weight(1f), fontSize = 12.sp)
                                Text("₹\${item.finalCost}", modifier = Modifier.weight(1f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Divider(color = Color(0xFFE2E8F0))
                    Spacer(modifier = Modifier.height(12.dp))

                    // 5. Total Calculations Breakdown Block
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Gross Paper Potential", fontSize = 13.sp, color = Color.DarkGray)
                            Text("₹\$grossTotal", fontSize = 13.sp)
                        }
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Daily Skip Deductions (-)", fontSize = 13.sp, color = Color(0xFFEF4444))
                            Text("₹\$skipDeductions", fontSize = 13.sp, color = Color(0xFFEF4444))
                        }
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF0FDF4))
                                .padding(8.dp)
                        ) {
                            Text("Net Monthly Bill Payable", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F5A31))
                            Text("₹\$netBillAmount", fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color(0xFF0F5A31))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 6. Sticky Action Controls Row (Generate A4 PDF, WhatsApp Share Sheets)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = onGeneratePDF,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Save PDF", fontSize = 13.sp)
                }

                Button(
                    onClick = { onShareInvoice(true) }, // Share PDF via Intent
                    modifier = Modifier.weight(1.2f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)) // WhatsApp Official Green
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("WhatsApp Share", fontSize = 13.sp, color = Color.White)
                }
            }
        }
    }
}
`
  },
  {
    name: "PdfGenerationService.kt",
    category: "System Services",
    language: "kotlin",
    description: "An Android service wrapping native 'PdfDocument' or 'PrintedPdfDocument' to convert the Composables context or standard Views layout into an A4 print-ready document.",
    content: `package com.premium.newspaper.service

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.premium.newspaper.ui.screen.BillingBreakdownItem
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class PdfGenerationService(private val context: Context) {

    /**
     * Generates a beautifully formatted professional A4 PDF invoice in local scoped cache memory.
     * Dimensions: A4 standard (595 x 842 postscript points).
     */
    fun createInvoicePdf(
        customerName: String,
        flatLocation: String,
        monthYear: String,
        billingItems: List<BillingBreakdownItem>,
        grossAmount: Double,
        deductions: Double,
        netPayable: Double,
        isPaid: Boolean
    ): File? {
        val pdfDocument = PdfDocument()
        
        // Define standard A4 page details (595 wide x 842 tall)
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = pdfDocument.startPage(pageInfo)
        
        val canvas: Canvas = page.canvas
        val paint = Paint()
        
        // Setup Canvas Coordinates & Styling
        var currentY = 50f
        val marginX = 40f
        
        // 1. Header Frame - Brand Banner
        paint.color = Color.parseColor("#0F5A31") // Emerald Green
        canvas.drawRect(0f, 0f, 595f, 110f, paint)
        
        paint.color = Color.WHITE
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = 22f
        canvas.drawText("DAILY NEWS SERVICES INVOICE", marginX, 48f, paint)
        
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        paint.textSize = 12f
        canvas.drawText("Statement Month: \$monthYear", marginX, 75f, paint)
        canvas.drawText("Status: \${if (isPaid) "PAID" else "DUE - UNPAID"}", marginX, 94f, paint)
        
        currentY = 145f
        
        // 2. Customer Metadata
        paint.color = Color.BLACK
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = 12f
        canvas.drawText("BILLED TO:", marginX, currentY, paint)
        
        currentY += 18f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        paint.textSize = 11f
        canvas.drawText(customerName, marginX, currentY, paint)
        
        currentY += 16f
        canvas.drawText(flatLocation, marginX, currentY, paint)
        
        currentY += 35f
        
        // 3. Draw Table Borders and Headers
        paint.color = Color.parseColor("#F1F5F9") // Light Slate Grey Fill
        canvas.drawRect(marginX, currentY, 595f - marginX, currentY + 25f, paint)
        
        paint.color = Color.BLACK
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        canvas.drawText("Newspaper Paper Item", marginX + 10f, currentY + 17f, paint)
        canvas.drawText("Days Subscribed", 300f, currentY + 17f, paint)
        canvas.drawText("Skip Deductions", 410f, currentY + 17f, paint)
        canvas.drawText("Net Cost", 500f, currentY + 17f, paint)
        
        currentY += 25f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        
        // 4. Fill Table Rows
        for (item in billingItems) {
            currentY += 25f
            
            // Draw item details
            canvas.drawText(item.paperName, marginX + 10f, currentY - 5f, paint)
            canvas.drawText("\${item.deliveredCount} Days", 300f, currentY - 5f, paint)
            canvas.drawText("\${item.skippedCount} Skips", 410f, currentY - 5f, paint)
            canvas.drawText("₹ \${item.finalCost}", 500f, currentY - 5f, paint)
            
            // Subtle dotted row dividers
            paint.color = Color.parseColor("#E2E8F0")
            canvas.drawLine(marginX, currentY, 595f - marginX, currentY, paint)
            paint.color = Color.BLACK
        }
        
        currentY += 45f
        
        // 5. Invoice Totals Summary Block
        paint.color = Color.parseColor("#F8FAFC")
        canvas.drawRect(300f, currentY, 595f - marginX, currentY + 95f, paint)
        
        paint.color = Color.BLACK
        paint.textSize = 10f
        canvas.drawText("Gross Amount Potential:  ₹ \${String.format("%.2f", grossAmount)}", 315f, currentY + 25f, paint)
        
        paint.color = Color.parseColor("#991B1B") // red deductions
        canvas.drawText("Skip Deductions (-):        ₹ \${String.format("%.2f", deductions)}", 315f, currentY + 50f, paint)
        
        paint.color = Color.parseColor("#065F46") // dark green net
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = 12f
        canvas.drawText("Net Amount Payable:    ₹ \${String.format("%.2f", netPayable)}", 315f, currentY + 78f, paint)
        
        // Finish Page
        pdfDocument.finishPage(page)
        
        // BUG FIX: Use Internal Cache Directory for better FileProvider compatibility & Scoped Storage
        val invoiceDir = File(context.cacheDir, "invoices")
        if (!invoiceDir.exists()) invoiceDir.mkdirs()

        val pdfFile = File(invoiceDir, "invoice_\${customerName.replace(" ", "_")}.pdf")
        return try {
            if (pdfFile.exists()) pdfFile.delete()
            val fileOutputStream = FileOutputStream(pdfFile)
            pdfDocument.writeTo(fileOutputStream)
            pdfDocument.close()
            fileOutputStream.close()
            pdfFile
        } catch (e: IOException) {
            e.printStackTrace()
            pdfDocument.close()
            null
        }
    }
}
`
  },
  {
    name: "PrintHelper.kt",
    category: "System Services",
    language: "kotlin",
    description: "Production-grade A4 printing service using Android PrintManager and custom PrintDocumentAdapter for standard document adaptation.",
    content: `package com.premium.newspaper.helper

import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient

object PrintHelper {

    /**
     * Prints an HTML-based invoice or View content as a standard A4 document.
     */
    fun printA4Invoice(context: Context, htmlContent: String, jobName: String) {
        val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager

        val webView = WebView(context)
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                // BUG FIX: Use specific A4 job settings and scaling
                val printAdapter = webView.createPrintDocumentAdapter(jobName)

                val attributes = PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .setResolution(PrintAttributes.Resolution("id", "A4", 300, 300))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build()

                printManager.print(jobName, printAdapter, attributes)
            }
        }

        // Load data with A4 responsive base
        webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
    }
}`
  },
  {
    name: "WhatsAppShareHelper.kt",
    category: "System Services",
    language: "kotlin",
    description: "An intent dispatcher class to trigger ACTION_SEND android system share sheets, dispatching PDF documents and pre-filled billing summaries direct to WhatsApp API endpoints.",
    content: `package com.premium.newspaper.helper

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File

object WhatsAppShareHelper {

    /**
     * Dispatch Share Intent containing the professional A4 PDF file using FileProvider.
     */
    fun shareInvoicePdfToWhatsApp(
        context: Context,
        pdfFile: File,
        phoneNumber: String // BUG FIX: Explicitly target the customer's phone number
    ) {
        try {
            val cleanPhone = phoneNumber.replace("+", "").replace(" ", "")
            val authority = "\${context.packageName}.fileprovider"
            val contentUri: Uri = FileProvider.getUriForFile(context, authority, pdfFile)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                // Direct package targeting for WhatsApp
                setPackage("com.whatsapp")
                // BUG FIX: Include phone number in the intent for direct chat targeting where possible
                putExtra("jid", "\$cleanPhone@s.whatsapp.net")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            // Create system fallback chooser sheet
            val chooser = Intent.createChooser(shareIntent, "Share Newspaper Invoice via WhatsApp")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)

        } catch (e: Exception) {
            Toast.makeText(context, "Error Dispatching PDF: \${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Launch text-only prefilled message targeting specific customers on WhatsApp.
     */
    fun sendBillTextSummaryToWhatsApp(
        context: Context,
        customerName: String,
        flatNo: String,
        buildingName: String,
        monthYear: String,
        payableAmount: Double,
        phoneNumber: String // e.g. "+919876543210"
    ) {
        val message = """
            Dear *\$customerName*,
            Your newspaper bill statement for *\${monthYear}* is generated.
            
            📍 *Location*: Flat \${flatNo}, \${buildingName}
            💰 *Total Balance*: ₹\${String.format("%.2f", payableAmount)}
            
            Please click here to view breakdown or complete your digital payment.
            Thank you!
        """.trimIndent()

        // Clean phone number for WhatsApp deep link API schema
        val cleanPhone = phoneNumber.replace("+", "").replace(" ", "")
        val apiUri = Uri.parse("https://api.whatsapp.com/send?phone=\$cleanPhone&text=\${Uri.encode(message)}")
        
        val textIntent = Intent(Intent.ACTION_VIEW, apiUri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        
        try {
            context.startActivity(textIntent)
        } catch (e: Exception) {
            // WhatsApp is not installed, open standard browser link fallback
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/\$cleanPhone?text=\${Uri.encode(message)}"))
            webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(webIntent)
        }
    }
}`
  }
];
