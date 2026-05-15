// MOLMS UI helper module
function esc(x){
  return (x ?? '').toString().replace(/[&<>\"']/g, m => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '\"':'&quot;',
    \"'\":'&#039;'
  }[m]))
}
