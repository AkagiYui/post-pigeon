const vqd = pm.response.headers.get("x-vqd-4")
console.log(vqd)
if (vqd) {
    
pm.environment.set("vqd", vqd);
}