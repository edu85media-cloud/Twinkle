const products = [
{
name:"قلادة النجمة",
price:"6.500",
stock:12,
image:"https://placehold.co/500x500/f8eef0/333?text=Twinkle"
},
{
name:"سوار اللؤلؤ",
price:"5.000",
stock:4,
image:"https://placehold.co/500x500/f8eef0/333?text=Twinkle"
},
{
name:"حلق الفراشة",
price:"4.500",
stock:1,
image:"https://placehold.co/500x500/f8eef0/333?text=Twinkle"
}
];

const grid=document.getElementById("productsGrid");

function stockText(stock){

if(stock<=0){
return "⚫ نفد المخزون";
}

if(stock===1){
return "🔴 آخر قطعة";
}

if(stock<=5){
return "🟠 باقي عدد محدود";
}

return "🟢 متوفر";

}

products.forEach(product=>{

grid.innerHTML+=`

<div class="card">

<img src="${product.image}">

<h3>${product.name}</h3>

<h4>${product.price} ر.ع</h4>

<p>${stockText(product.stock)}</p>

<button>

🛍️ أضيفي إلى الحقيبة

</button>

</div>

`;

});
