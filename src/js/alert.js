export default function newAlert(text,type){

const colors = [{"type":"warn","clr":"#dcd50ad4"},{"type":"error","clr":"#ef1a1ab1"},{"type":"success","clr":"#3b987e"},{"type":"info","clr":"#101211"}];

let CurrentColor = colors.filter((e) => e.type === type)[0].clr;

const Alert = document.createElement("p");
Alert.classList.add("Alert");
Alert.style.backgroundColor = CurrentColor;
Alert.textContent = text; 
document.body.appendChild(Alert);

}