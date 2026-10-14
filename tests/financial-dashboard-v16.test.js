const assert = require('node:assert/strict');

global.window = global;
global.addEventListener = ()=>{};
global.setInterval = ()=>0;
global.setTimeout = ()=>0;
global.document = {getElementById(){return null},addEventListener(){}};
let selectedPeriod={start:'2026-09-01',end:'2026-09-13',monthStr:'2026-09'};
global.fdGetPeriodDates = ()=>selectedPeriod;
global.fdCashContinuity = ()=>({openingByCur:{TZS:358000},closingByCur:{TZS:1258000}});
global._fdAllEntries = [{date:'2026-09-05',amount:100000,status:'verified'}];
global._fdAllPayroll = [];
global._fdAllOfficeExpenses = [];
global._fdAllHistPayroll = [];
global._fdAllInvoices = [
  {id:'earsc',invoice_type:'tax',status:'part_paid',client_name:'EARSC',currency:'TZS',invoice_date:'2026-08-23',updated_at:'2026-08-27',total_due:7000000,amount_paid:3500000},
  {id:'hesu',invoice_type:'tax',status:'issued',client_name:'HESU',currency:'TZS',invoice_date:'2026-08-26',total_due:1180000,amount_paid:0},
  {id:'zana',invoice_type:'tax',status:'paid',client_name:'Zana',currency:'TZS',invoice_date:'2026-08-26',updated_at:'2026-08-27',total_due:708000,amount_paid:678000,withholding_tax_amount:30000},
  {id:'royal',invoice_type:'tax',status:'issued',client_name:'Royal Oven',currency:'TZS',invoice_date:'2026-08-27',total_due:1000000,amount_paid:0},
  {id:'settled-vat',invoice_type:'tax',status:'paid',client_name:'Prior-period VAT Client',currency:'TZS',invoice_date:'2026-08-30',updated_at:'2026-09-13',vat_amount:180000,total_due:1180000,amount_paid:1130000,withholding_tax_amount:50000},
  {id:'kaisa',invoice_type:'proforma',status:'issued',client_name:'Kaisa',currency:'USD',invoice_date:'2026-09-01',vat_amount:540,total_due:3540,amount_paid:0},
  {id:'petra',invoice_type:'tax',status:'part_paid',client_name:'Petra',currency:'TZS',invoice_date:'2026-09-02',updated_at:'2026-09-05',total_due:6000000,amount_paid:5000000,notes:'[Payment 2026-09-03] Cash 5,000,000 · Cash'},
  {id:'pacific',invoice_type:'tax',status:'issued',client_name:'Pacific Oil',currency:'USD',invoice_date:'2026-09-07',total_due:250,amount_paid:0},
  // Synthetic test-only records: not client data and not sourced from production.
  {id:'test-prior-invoice-a',invoice_type:'tax',status:'paid',client_name:'Test invoice A',currency:'TZS',invoice_date:'2026-09-02',total_due:100,amount_paid:100,notes:'[Payment 2026-10-03] Cash 100'},
  {id:'test-prior-invoice-b',invoice_type:'tax',status:'paid',client_name:'Test invoice B',currency:'TZS',invoice_date:'2026-09-08',total_due:200,amount_paid:200,notes:'[Payment 2026-10-08] Cash 200'},
  {id:'test-prior-invoice-c',invoice_type:'tax',status:'part_paid',client_name:'Test invoice C',currency:'TZS',invoice_date:'2026-09-10',total_due:300,amount_paid:300,notes:'[Payment 2026-10-12] Cash 300'}
];
global._fdAllManual = [
  {id:'expense-test',status:'approved',tx_type:'expenditure',date:'2026-09-06',amount:25000,currency:'TZS'},
  {id:'b1',status:'approved',tx_type:'revenue',date:'2026-09-01',amount:1000000,currency:'TZS',client_receivable:true,agreed_amount:1200000,outstanding_amount:200000,receivable_client_name:'Bassam'},
  {id:'b2',status:'approved',tx_type:'revenue',date:'2026-09-03',amount:1000000,currency:'TZS',client_receivable:true,agreed_amount:2000000,outstanding_amount:1000000,receivable_client_name:'Bassam'},
  {id:'magnus',status:'approved',tx_type:'revenue',date:'2026-09-11',amount:3000000,currency:'TZS',client_receivable:true,agreed_amount:5000000,outstanding_amount:2000000,receivable_client_name:'Magnus'},
  {id:'mama',status:'approved',tx_type:'revenue',date:'2026-09-12',amount:1000000,currency:'TZS',client_receivable:true,agreed_amount:3000000,outstanding_amount:2000000,receivable_client_name:'Mama Chitemo'},
  {id:'d1',status:'approved',tx_type:'drawing',date:'2026-09-05',amount:1000000,currency:'TZS'},
  {id:'d2',status:'approved',tx_type:'drawing',date:'2026-09-05',amount:6000000,currency:'TZS'},
  {id:'d3',status:'approved',tx_type:'drawing',date:'2026-09-11',amount:3000000,currency:'TZS'}
];

require('../js/financial-dashboard-v16.js');
const audit=global.MOLMSFinanceV16.audit();
assert.deepEqual(audit.revenue,{TZS:17200000,USD:250});
assert.deepEqual(audit.collected,{TZS:12180000}); // includes TZS 1,180,000 received in-period on an August invoice
assert.deepEqual(audit.newReceivables,{TZS:6200000,USD:250});
assert.deepEqual(audit.expenses,{TZS:25000});
assert.deepEqual(audit.totalReceivables,{TZS:11880000,USD:250});
assert.deepEqual(audit.cash,{TZS:1258000});
assert.deepEqual(audit.vat.payable,{TZS:180000});
assert.deepEqual(audit.vat.pipeline,{TZS:0,USD:540});
assert.equal(audit.vat.taxInvoiceCount,1);
assert.equal(audit.vat.proformaCount,1);
assert.equal(global.MOLMSFinanceV16.periodClientRows().find(r=>r.client==='Magnus').outstanding,2000000);

// October collections must follow payment dates even when the invoices were
// issued in September. Those receipts must not become October recognised revenue.
global._fdAllInvoices.push(
  {id:'hesu-oct',invoice_type:'tax',status:'part_paid',client_name:'HESU October receipt',currency:'TZS',invoice_date:'2026-09-02',total_due:1180000,amount_paid:1180000,notes:'[Payment 2026-10-03] Cash 1,180,000'},
  {id:'mercury-oct',invoice_type:'tax',status:'part_paid',client_name:'Mercury October receipt',currency:'TZS',invoice_date:'2026-09-08',total_due:2000000,amount_paid:500000,notes:'[Payment 2026-10-08] Cash 500,000'},
  {id:'zana-bora-oct',invoice_type:'tax',status:'paid',client_name:'Zana Bora October receipt',currency:'TZS',invoice_date:'2026-09-10',total_due:708000,amount_paid:708000,notes:'[Payment 2026-10-12] Cash 708,000'}
);
selectedPeriod={start:'2026-10-01',end:'2026-10-14',monthStr:'2026-10'};
const october=global.MOLMSFinanceV16.audit();
assert.deepEqual(october.collected,{TZS:600}); // synthetic test records only
assert.deepEqual(october.revenue,{TZS:0});
assert.deepEqual(october.newReceivables,{TZS:0});
console.log('financial-dashboard-v16 reconciliation + October payment-date regression: PASS');