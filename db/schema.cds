// ═══════════════════════════════════════════════════════
//  SmartHostel BTP — CDS Schema
//  SAP Cloud Application Programming Model
//  DB: SQLite (dev) / SAP HANA Cloud (production)
// ═══════════════════════════════════════════════════════

namespace smarthostel;
using { cuid, managed } from '@sap/cds/common';

entity Rooms : cuid, managed {
  roomNumber  : String(10)   not null;
  block       : String(20)   not null;
  floor       : Integer      default 1;
  type        : String(30)   not null;
  capacity    : Integer      not null default 2;
  occupied    : Integer      default 0;
  status      : String(20)   default 'Vacant';
  monthlyRent : Decimal(10,2) not null;
  isACRoom    : Boolean      default false;
}

entity Students : cuid, managed {
  studentID   : String(15)  not null;
  name        : String(100) not null;
  email       : String(255) not null;
  phone       : String(15);
  gender      : String(10);
  course      : String(50)  not null;
  year        : Integer     not null default 1;
  room        : Association to Rooms;
  status      : String(20)  default 'Active';
  feeStatus   : String(20)  default 'Pending';
  joiningDate : Date;
  exitDate    : Date;
}

entity Payments : cuid, managed {
  invoiceNumber  : String(20)  not null;
  student        : Association to Students not null;
  type           : String(30)  not null;
  amount         : Decimal(12,2) not null;
  dueDate        : Date        not null;
  paidDate       : Date;
  status         : String(20)  default 'Pending';
  paymentMode    : String(30);
  transactionRef : String(50);
  lateFeeApplied : Decimal(10,2) default 0;
  receiptNumber  : String(20);
}

entity Complaints : cuid, managed {
  complaintID    : String(15)  not null;
  student        : Association to Students not null;
  roomNumber     : String(10);
  category       : String(30)  not null;
  priority       : String(10)  default 'Medium';
  description    : String(500);
  status         : String(20)  default 'Open';
  assignedTo     : String(100);
  resolvedDate   : DateTime;
  resolutionNote : String(500);
}

entity Vendors : cuid, managed {
  vendorCode : String(10)  not null;
  name       : String(100) not null;
  category   : String(50);
  contact    : String(15);
  rating     : Integer     default 3;
  status     : String(20)  default 'Approved';
}

entity PurchaseOrders : cuid, managed {
  poNumber      : String(15)   not null;
  vendor        : Association to Vendors not null;
  itemDesc      : String(200)  not null;
  category      : String(50);
  quantity      : Decimal(10,3) not null;
  unitPrice     : Decimal(12,2) not null;
  totalAmount   : Decimal(14,2);
  status        : String(20)   default 'Draft';
  deliveryDate  : Date;
  grnNumber     : String(15);
  invoiceRef    : String(20);
  threeWayMatch : Boolean      default false;
}

entity Visitors : cuid, managed {
  visitorName : String(100) not null;
  phone       : String(15);
  student     : Association to Students;
  roomNumber  : String(10);
  purpose     : String(50);
  entryTime   : DateTime    not null;
  exitTime    : DateTime;
  status      : String(20)  default 'Inside';
}

entity Logs : cuid, managed {
  level   : String(10)  not null;
  module  : String(50)  not null;
  message : String(500) not null;
  user    : String(100) default 'system';
  meta    : LargeString;
}
