let statue = true;

const $ = (selector) => { return document.querySelectorAll(selector)};

const changer = (item,type,value) => {item.closest("label").querySelector("input").setAttribute(type,value); };



$(".eye").forEach((i)=>{
    i.addEventListener("click",(e)=>{
      statue ? statue = false : statue = true ;
      $(".eye").forEach((i)=>{
         i.classList.toggle("fa-eye-slash");
         i.classList.toggle("fa-eye");
         statue == true ? changer(i,"type","password") : changer(i,"type","text");
     });
  });
});
