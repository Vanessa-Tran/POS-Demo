<script>
	import {fetchItemDetail} from './com.js'

	let idsearch = '';
	let itemdetail = null;
	let pendingItems = [];
	let total = 0;
	async function sendID(event) {
		if (event.key === "Enter") {
			console.log("sending " + idsearch)
			itemdetail = await fetchItemDetail(idsearch)
    	}
	}
	function addToPurchase(discount){
		
		// Search for existing item
		let foundItem = false
		for (const li of pendingItems) {
			
			if (li.item.id === itemdetail.id && li.discountpc === discount) {
				li.quantity += 1
				foundItem = true
				pendingItems = pendingItems //update UI
			}
		}

		if (foundItem === false) {
			console.log("Adding Item")
			let lineitem = {
				item: itemdetail,
				quantity: 1,
				discountpc: discount
			} //creating lineitem object to save the items in line and keep the unchange of item details. 
			console.log(lineitem)
			pendingItems = [lineitem, ...pendingItems];
		}

		console.log(pendingItems)
		CalcTotalPrice()
	}

	async function SelectItem(item, qty) {
		console.log("Selecting item: " + item.id)
		itemdetail = await fetchItemDetail(item.id)
		//itemdetail = item
	}

	function CalcTotalPrice(){
		total = 0
		pendingItems.forEach(pendingItem => {
			total = total + pendingItem.item.price * pendingItem.quantity * (1 - pendingItem.discountpc)
		})
	}


	function clear(){
		pendingItems = []
		CalcTotalPrice()
	}
	
</script>

<div id='page'>
	<h1>VANESSA'S STORE!</h1>
	<div id='maincontent'>
		<div id='firstsection'>
			<input on:keyup="{sendID}" bind:value={idsearch} placeholder="enter item id pls">

			{#if itemdetail !== null}
				<h2>
					<b>
						{itemdetail.id} : {itemdetail.name} : {itemdetail.price}
					</b>
				</h2>
				<button on:click="{()=>addToPurchase(0.0)}">ADD</button>
				
				Discount:
				<button on:click="{()=>addToPurchase(0.05)}">5%</button>
				<button on:click="{()=>addToPurchase(0.1)}">10%</button>
				<button on:click="{()=>addToPurchase(0.15)}">15%</button>
				<button on:click="{()=>addToPurchase(0.2)}">20%</button>
				<button on:click="{()=>addToPurchase(0.5)}">50%</button>
			{/if}
		</div>
		<div id='orderinfo'>
			<table id='pendingItemtable'>
			{#each pendingItems as {item, quantity, discountpc}, i}
				<!---div on:click="{SelectItem(item, quantity)}"> {item.id}: {quantity} : {discountpc} : ${item.price*quantity*(1-discountpc)} </div>-->
				<tr on:click="{SelectItem(item, quantity)}">
			
					<td>{item.id}</td>
					<td>{quantity}</td>
					<td>{discountpc*100}%</td>
					<td>${item.price*quantity*(1-discountpc)}</td>
				</tr>
			{/each}
			</table>
			<div id='endcontent'>
				TOTAL: ${total}
				<button on:click="{clear}">CASH</button>
				<button on:click="{clear}">EFTPOS</button>
			</div>
		</div>
	</div>
</div>
<!-- Styling my demo -->
<style>
#page {
	display:flex;
	flex-direction: column;
	height: 100%;
	background-color:#606EFF;
}

#maincontent {
	display: flex;
	flex-direction: row;
	height: 100%;
	
}
#firstsection {
	width: 70%;
	background-color: #C5CBE9;
}
#orderinfo {
	height: 100%;
	width: 30%;
	background-color: #939DFF;
}
#endcontent {
	position:absolute; 
	bottom: 0; 
	width: 30%;
}
#endcontent>button {
	float:right;
}
h1 {
	color: rgba(255, 255, 255, 0.87);
	margin-left: 10px;
}
#pendingItemtable {
	text-align: center;
	width: 100%;
	
}

</style>