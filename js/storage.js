// MOLMS storage and persistence helpers
function write(k,v){
  localStorage.setItem(k,JSON.stringify(v))
}
function read(k){
  try{
    return JSON.parse(localStorage.getItem(k)||'[]')
  }catch(e){
    return []
  }
}
