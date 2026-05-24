// MOLMS utility helpers

function today(){
  return new Date().toISOString().slice(0,10)
}
function searchText(v){
  return (v ?? '').toString().toLowerCase();
}
