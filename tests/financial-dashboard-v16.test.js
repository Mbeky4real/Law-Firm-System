const assert = require('node:assert/strict');

global.window = global;
global.addEventListener = ()=>{};
global.document = {getElementById(){return null},addEventListener(){}};
global.fdGetPeriodDates = ()=>({start:'2026-09-01',end:'2026-09-13',monthStr:'2026-09'});
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
  {id:'kaisa',invoice_type:'proforma',status:'issued',client_name:'Kaisa',currency:'USD',invoice_date:'2026-09-01',vat_amount:540,total_due:3540,amount_paid:0},
  {id:'petra',invoice_type:'tax',status:'part_paid',client_name:'Petra',currency:'TZS',invoice_date:'2026-09-02',updated_at:'2026-09-05',total_due:6000000,amount_paid:5000000,notes:'[Payment 2026-09-03] Cash 5,000,000 · Cash'},
  {id:'pacific',invoice_type:'tax',status:'issued',client_name:'Pacific Oil',currency:'USD',invoice_date:'2026-09-07',total_due:250,amount_paid:0}
];
global._fdAllManual = [
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
assert.deepEqual(audit.collected,{TZS:11000000,USD:0});
assert.deepEqual(audit.newReceivables,{TZS:6200000,USD:250});
assert.deepEqual(audit.totalReceivables,{TZS:11880000,USD:250});
assert.deepEqual(audit.cash,{TZS:1258000});
assert.deepEqual(audit.vat.payable,{TZS:0,USD:0});
assert.deepEqual(audit.vat.pipeline,{TZS:0,USD:540});
assert.equal(audit.vat.taxInvoiceCount,0);
assert.equal(audit.vat.proformaCount,1);
assert.equal(global.MOLMSFinanceV16.periodClientRows().find(r=>r.client==='Magnus').outstanding,2000000);
console.log('financial-dashboard-v16 reconciliation: PASS');