from pathlib import Path
import re

p=Path('app-core.html')
s=p.read_text(errors='surrogateescape')
mark='MOLMS-REPORT-DETAILS-MOBILE-V1'
if mark not in s:
    required=['id="page-reportdetails"','id="rdTitle"','id="rdReportInfo"','id="rdWorkPerformed"','id="rdAttention"','id="rdReview"','id="rdReviewActions"','id="rdDiaryEvent"','id="rdDocuments"','A. REPORT INFORMATION','B. WORK PERFORMED','C. PARTNER ATTENTION','D. PARTNER REVIEW']
    for x in required:
        assert x in s, 'missing report marker: '+x
    css='''\n<style>\n/* MOLMS-REPORT-DETAILS-MOBILE-V1 */\n@media (max-width:1199px){\nbody{overflow-x:hidden!important}.topbar2{padding-top:calc(10px + env(safe-area-inset-top))!important}\n#page-reportdetails{width:100%!important;max-width:100%!important;overflow-x:hidden!important}\n#page-reportdetails>.card{width:100%!important;max-width:100%!important;margin:0!important;padding:14px!important;border-radius:18px!important;overflow:hidden!important}\n#page-reportdetails>.card>div[style*="grid-template-columns:1fr 1fr"]{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important;align-items:stretch!important;margin-top:14px!important}\n#page-reportdetails>.card>div[style*="grid-template-columns:1fr 1fr"]>div{min-width:0!important;width:100%!important}\n#page-reportdetails .card .card{width:100%!important;max-width:100%!important;min-width:0!important;margin:0 0 12px!important;padding:15px!important;border-radius:16px!important;box-shadow:0 3px 12px rgba(15,36,64,.045)!important}\n#page-reportdetails .card .card:last-child{margin-bottom:0!important}\n#rdTitle{font-size:26px!important;line-height:1.12!important;overflow-wrap:anywhere!important}\n#rdRef,#rdMatter{overflow-wrap:anywhere!important;word-break:normal!important}\n#rdReportInfo,#rdWorkPerformed,#rdAttention,#rdReview,#rdDiaryEvent,#rdDocuments{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important}\n#rdReportInfo table,#rdWorkPerformed table,#rdAttention table,#rdReview table,#rdDiaryEvent table,#rdDocuments table{width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important}\n#rdReportInfo td,#rdWorkPerformed td,#rdAttention td,#rdReview td,#rdDiaryEvent td,#rdDocuments td{white-space:normal!important;vertical-align:top!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.38!important}\n#rdReportInfo td:first-child,#rdWorkPerformed td:first-child,#rdAttention td:first-child,#rdReview td:first-child,#rdDiaryEvent td:first-child,#rdDocuments td:first-child{width:39%!important;padding:8px 8px 8px 0!important;color:var(--muted)!important}\n#rdReportInfo td:last-child,#rdWorkPerformed td:last-child,#rdAttention td:last-child,#rdReview td:last-child,#rdDiaryEvent td:last-child,#rdDocuments td:last-child{width:61%!important;padding:8px 0 8px 8px!important;font-weight:700!important}\n#rdReviewActions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}\n#rdReviewActions .btn{width:100%!important;min-height:42px!important;white-space:normal!important;text-align:center!important}\n#rdArchiveBtn .btn{min-height:38px!important}#rdStatusPill .pill{font-size:12px!important;padding:6px 10px!important}\n}\n@media (max-width:480px){#page-reportdetails>.card{padding:12px!important}#page-reportdetails .card .card{padding:14px 13px!important}#rdTitle{font-size:24px!important}#rdReportInfo td:first-child,#rdWorkPerformed td:first-child,#rdAttention td:first-child,#rdReview td:first-child,#rdDiaryEvent td:first-child,#rdDocuments td:first-child{width:40%!important}#rdReportInfo td:last-child,#rdWorkPerformed td:last-child,#rdAttention td:last-child,#rdReview td:last-child,#rdDiaryEvent td:last-child,#rdDocuments td:last-child{width:60%!important}}\n</style>\n'''
    m=re.search(r'</body>\s*</html>\s*$',s,re.I|re.S)
    assert m, 'terminal document close missing'
    s=s[:m.start()]+css+s[m.start():]
    assert s.count(mark)==1
    for x in ['function rdRenderDetails','partnerReviewReport','openRevisionModal']:
        assert x in s, 'behavior marker lost: '+x
    p.write_text(s,errors='surrogateescape')

ip=Path('index.html')
idx=ip.read_text()
for old in ["frame.src='/app-core.html?v=20260908k'","frame.src='/app-core.html?v=20260910a'"]:
    if old in idx:
        idx=idx.replace(old,"frame.src='/app-core.html?v=20260910b'")
ip.write_text(idx)
