from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-INVOICE-PAYMENT-CONTEXT-V3'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<script>
/* MOLMS-INVOICE-PAYMENT-CONTEXT-V3 */
(function(){
  const baseRecord=window.invRecordPayment;
  if(typeof baseRecord==='function'){
    window.invRecordPayment=async function(){
      const args=arguments;
      if(typeof page!=='undefined'&&page!=='invoice'&&typeof go==='function'){
        go('invoice');
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      }
      return baseRecord.apply(this,args);
    };
  }
  const baseSubmit=window.invSubmitPayment;
  if(typeof baseSubmit==='function'){
    window.invSubmitPayment=async function(){
      if(typeof page!=='undefined'&&page!=='invoice'&&typeof go==='function'){
        go('invoice');
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
      return baseSubmit.apply(this,arguments);
    };
  }
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')
