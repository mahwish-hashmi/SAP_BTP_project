using { smarthostel as db } from '../db/schema';

service HostelService @(path: '/odata/v4/HostelService') {

  // ── Core entities ─────────────────────────────────
  @odata.draft.enabled
  entity Rooms as projection on db.Rooms;

  @odata.draft.enabled
  entity Students as projection on db.Students
    actions {
      action checkout() returns String;
    };

  entity Payments       as projection on db.Payments;
  entity Complaints     as projection on db.Complaints;
  entity Vendors        as projection on db.Vendors;
  entity PurchaseOrders as projection on db.PurchaseOrders;
  entity Visitors       as projection on db.Visitors;
  entity Logs           as projection on db.Logs;

  // ── Actions ───────────────────────────────────────

  action allocateRoom(
    studentID : String,
    roomType  : String,
    floorPref : Integer,
    blockPref : String,
    acRequired: Boolean
  ) returns {
    roomNumber  : String;
    block       : String;
    type        : String;
    matchScore  : Integer;
    monthlyRent : Decimal;
    roomID      : String;
  };

  action classifyComplaintPriority(
    category : String
  ) returns {
    priority  : String;
    slaHours  : Integer;
    assignTo  : String;
  };

  action generateMonthlyInvoices(
    month : Integer,
    year  : Integer
  ) returns {
    invoicesCreated : Integer;
    totalAmount     : Decimal;
    skipped         : Integer;
  };

  action markPaymentPaid(
    paymentID     : String,
    paymentMode   : String,
    transactionRef: String
  ) returns {
    receiptNumber : String;
    status        : String;
  };

  action triggerJob(
    jobName : String
  ) returns {
    result  : String;
    details : String;
  };

  // ── Functions ─────────────────────────────────────

  function getDashboardKPIs() returns {
    totalStudents    : Integer;
    occupancyRate    : Decimal;
    pendingFees      : Decimal;
    openComplaints   : Integer;
    monthlyRevenue   : Decimal;
    resolvedToday    : Integer;
    collectionRate   : Decimal;
    slaBreached      : Integer;
  };

  function getMonthlyReport(
    month : Integer,
    year  : Integer
  ) returns {
    totalRevenue   : Decimal;
    totalExpenses  : Decimal;
    netSurplus     : Decimal;
    collectionRate : Decimal;
    invoiceCount   : Integer;
  };

  function getRevenueTrend() returns array of {
    month   : String;
    revenue : Decimal;
    trendKey: String;  
  };

  function getComplaintStats() returns {
    total              : Integer;
    openCount          : Integer;
    breachedCount      : Integer;
    avgResolutionHours : Decimal;
  };
}