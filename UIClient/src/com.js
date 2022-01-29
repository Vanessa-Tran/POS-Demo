let cache = {} 

export async function fetchItemDetail(identifier) {
    console.log("fetching item detail")
    let currentTime = new Date()
    let cacheMaxtime = 1 * 60 * 1000
    
    if (identifier in cache && currentTime.getTime() - cache[identifier].ts < cacheMaxtime) {
        return cache[identifier].data //cacheEntry
    }else{
        let x = await axios.get('http://localhost:8080/' + identifier)
        let jsonresponse = x.data
        let cacheEntry = {
            data:jsonresponse,
            ts: currentTime.getTime()
        }
        cache[identifier] = cacheEntry //cacheEntry is a pair of jsontext and timestamp
        return jsonresponse //jsontext
    }
}
