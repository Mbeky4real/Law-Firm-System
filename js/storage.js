// MOLMS storage and persistence helpers
function write(k,v){
  localStorage.setItem(k,JSON.stringify(v))
}
