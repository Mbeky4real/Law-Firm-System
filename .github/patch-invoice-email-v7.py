from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
MARK='MOLMS-INVOICE-EMAIL-V7'
if MARK in s:
    print('already patched')
    raise SystemExit(0)
old="""      const {data,error}=await sb.functions.invoke('send-invoice-email',{body:{invoice_id:emailCtx.invoiceId,recipient_email:to,cc_email:cc||null,subject,message}});\n      if(error) throw error;\n      if(data?.error) throw new Error(data.error);"""
new="""      /* MOLMS-INVOICE-EMAIL-V7 */\n      const {data,error}=await sb.functions.invoke('send-invoice-email',{body:{invoice_id:emailCtx.invoiceId,recipient_email:to,cc_email:cc||null,subject,message}});\n      if(error){\n        let detail='';\n        try{\n          if(error.context && typeof error.context.json==='function'){\n            const body=await error.context.json();\n            detail=body?.error||body?.message||'';\n          }\n        }catch(_e){}\n        throw new Error(detail||error.message||'Email delivery request failed.');\n      }\n      if(data?.error) throw new Error(data.error);"""
if old not in s:
    raise SystemExit('Expected invoice email invoke block not found')
s=s.replace(old,new,1)
old2="""      const msg=err?.context?.body?.error||err?.message||'Email could not be sent.';\n      showErr(msg);"""
new2="""      const msg=err?.message||'Email could not be sent.';\n      showErr(msg);"""
if old2 not in s:
    raise SystemExit('Expected invoice email error block not found')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
print('invoice email v7 applied')
