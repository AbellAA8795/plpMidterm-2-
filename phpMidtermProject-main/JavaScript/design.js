const loginForm = document.getElementById('jsLogin');
const registerForm = document.getElementById('jsRegister');
let error = document.getElementById('jsLoginError')
let email = document.getElementsByClassName('jsDesignEmail');
let password = document.getElementsByClassName('jsDesignPassword');
let userEmail = document.getElementById('jsEmail');
let userPassword = document.getElementById('jsPassword');
let registerName = document.getElementById('jsName')
let registerPassword = document.getElementById('jsRegPassword')
let registerConfirmPassword = document.getElementById('jsRegConfirmPassword')
let regpass = document.getElementsByClassName('jsDesPassword')
let regConPass = document.getElementsByClassName('jsDesConPassword')
let errorPassword = document.getElementsByClassName('regErrorPassword');
let errorConformPassword = document.getElementsByClassName('regErrorConfirmPassword');

let isWrong = false;
let isRegWrong = false;
registerForm.style.display="none";

// for login verification2

function verifyInput (event){
    event.preventDefault();

    //for testing only 
    const myUsername = 'GabrielRey@gmail.com';
    const myPassword = 'hawakmoangbeat';

    if (userEmail.value === "" || userPassword.value === ""){
        isWrong = true;
        wrongInput();
        error.innerHTML = '*Fill in the form';
        error.style.color = 'red';
        userEmail.value = "";
        userPassword.value = "";
    }else if(userEmail.value !== myUsername || userPassword.value !== myPassword){
        isWrong = true;
        wrongInput();
        error.innerHTML = '*Email or Password is incorrect';
        error.style.color = 'red';
        userEmail.value = "";
        userPassword.value = "";
    }else{
        error.innerHTML = '*You are in!';
        error.style.color = 'green';
        userEmail.value = "";
        userPassword.value = "";
        isWrong=false;
        wrongInput();
    }

}

// Change input style to red if input is wrong
const wrongInput = () => {
    if(isWrong) {
        
        for (let i = 0; i < email.length; i++) {
            email[i].style.border = "1px solid red";
        }

        for (let i = 0; i < password.length; i++) {
            password[i].style.border = "1px solid red";
        }
    }else{
        for (let i = 0; i < email.length; i++) {
            email[i].style.border = "none";
        }

        for (let i = 0; i < password.length; i++) {
            password[i].style.border = "none";
        }
    }

};

// moving between login and register
const toRegister = (isVisible) => {
    if (isVisible) {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
        isWrong = false;
        error.innerHTML = '';
        error.style.color = "black";
        wrongInput();
    }
};

const toLogin = (isVisible) => {
    if(isVisible){
        loginForm.style.display = "block";
        registerForm.style.display = "none";
    }
};

// for register verification

registerName.addEventListener('keydown',function(event){
    if ((/\d/g).test(event.key)) {
      event.preventDefault(); 
    }
});

function passwordConfirmation(event){
    event.preventDefault(); 
    if(registerPassword.value !== registerConfirmPassword.value){
        isRegWrong = true;
        for (let i = 0; i < errorPassword.length; i++) {
            errorPassword[i].innerHTML = ' Password not equal';
        }
        for (let i = 0; i < errorConformPassword.length; i++) {
            errorConformPassword[i].innerHTML = ' Password not equal';
        }
        
        for(let i = 0; i < regpass.length; i++){
            regpass[i].style.border = "1px solid red"
        }
        for(let i = 0; i < regConPass.length; i++){
            regConPass[i].style.border = "1px solid red"
        }
        passwordErrors();
    }else{
        isRegWrong = false;
        for (let i = 0; i < errorPassword.length; i++) {
            errorPassword[i].innerHTML = '';
        }
        for (let i = 0; i < errorConformPassword.length; i++) {
            errorConformPassword[i].innerHTML = '';
        }
        
        for(let i = 0; i < regpass.length; i++){
            regpass[i].style.border = "none"
        }
        for(let i = 0; i < regConPass.length; i++){
            regConPass[i].style.border = "none"
        }
    }
}

function passwordErrors(){


    if(isRegWrong){
        for(let i = 0; i < errorPassword.length; i++){
            errorPassword[i].style.color = 'red';
        }
        for(let i = 0; i < errorConformPassword.length; i++){
            errorConformPassword[i].style.color = 'red';
        }
    }else{
        for(let i = 0; i < errorPassword.length; i++){
            errorPassword[i].style.color = 'black';
        }
        for(let i = 0; i < errorConformPassword.length; i++){
            errorConformPassword[i].style.color = 'black';
        }
    }
}