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
function $(id){
  return document.getElementById(id)
}

function val(id){
  return $(id).value.trim()
}

function clear(id){
  $(id).value = ''
}
