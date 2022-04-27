const express = require('express');
const app = express();
const multer = require('multer');
const fs = require('fs');
const natural = require('natural');

const storage = multer.diskStorage ({
    destination: 'uploads/',
    filename: function(req,file,cb){
        cb("","test.txt");
    }
});

const upload = multer ({
    storage: storage
}); 

//Captura datos del formulario
app.use(express.urlencoded({extended:false}));
app.use(express.json());

const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

app.use('/resources',express.static('public'));
app.use('/resources',express.static(__dirname + '/public'));
console.log(__dirname);

app.set('view engine', 'ejs');

const bcriptjs = require('bcryptjs');

//configuraciones de variables de sesiones
const session = require('express-session');
app.use(session({
    secret: 'secret',//se puede mejorar generando un numero aleatorio
    resave: true,
    saveUninitialized:true
}))

//conexion a la base de datos
const connection = require('./database/db');
const req = require('express/lib/request');
const res = require('express/lib/response');
const { default: fetch} = require('node-fetch');

//Rutas
app.get('/login',(req,res)=>{
    res.render('login');
})

app.get('/register',(req,res)=>{
    res.render('register');
})

//Base de datos, Registro
app.post('/register', async (req,res)=>{
    const name = req.body.name;
    const email = req.body.email;
    const pass = req.body.pass;
    let passwordHaash = await bcriptjs.hash(pass,8);
    connection.query('INSERT INTO users SET ?', {name:name, email:email, pass:passwordHaash}, async(error, result)=>{
        if(error){
            console.log(error);
        }else{
            res.render('register',{
              alert:true,
                alertTitle: "Registration",
                alertMessage: "Registro exitoso!",
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta:''
            });
            res.send('ALTA EXITOSA')
        }   
    })

})

//Autenticacion
app.post('/auth', async(req,res)=>{
    const email = req.body.email;
    const pass = req.body.pass;
    let passwordHaash = await bcriptjs.hash(pass,8);
    if(email && pass){
        connection.query('SELECT * FROM  users WHERE email = ?', [email], async(error, results) =>{
            if(results.length == 0 || !(await bcriptjs.compare(pass,results[0].pass))){
                res.render('login',{
                    alert:true,
                    alertTitle:"Error",
                    alertMessage:"Usuario y/o pasword incorrectos",
                    alertIcon: "error",
                    showConfirmButton:true,
                    timer:false,
                    ruta:'login'
                });
            }
            else{
                req.session.loggedin = true;
                req.session.name = results[0].name
                res.render('login',{
                    alert:true,
                    alertTitle:"Conexion exitosa",
                    alertMessage:"Login correcto",
                    alertIcon: "success",
                    showConfirmButton:false,
                    timer:1500,
                    ruta:''
                });
            }
        })    
    } 
    else{
        req.session.name = results[0].name
                res.render('login',{
                    alert:true,
                    alertTitle:"Alerta",
                    alertMessage:"Debe ingresar un correo electronico valido y una contraseña",
                    alertIcon: "warning",
                    showConfirmButton:true,
                    timer:1500,
                    ruta:''
                });
    }
})

//Autenticacion para todas las paginas
app.get('/',(req,res)=>{
    if(req.session.loggedin){
        res.render('index',{
            login:true,
            name: req.session.name
        })
    }
    else{
        res.render('index', {
            login:false,
            name:'Bienvenido. Debe iniciar session para continuar'
        })
    }

})

//cierre de sesion
app.get('/logout', (req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/')
    })
})

//Carga de archivos
app.post('/files', upload.any('file') ,(req,res)=>{
    const tex = req.body.tex;
    res.send("Archivo cargado");
    fs.readFile('uploads/test.txt','utf-8',(error,tex)=>{
        if(error){
            throw error;
        }
        else{
            console.log('Error: ',error);
        }
    })
    //Lectura y extraccion de texto del archivo, se guarda en "uploads"
    fs.readFile('uploads/test.txt', 'utf-8' , (error,data)=>{
        if(!error){
            console.log(data);
            connection.query('INSERT INTO comments SET ?', {doctex:tex, analysistex:tex}, async(error, result)=>{})
        }
        else{
            console.log('Error: ',error);
        }
    })
})

//Uso de API SENTIM-API
const body = {a: 1};
const t = "We have been through much darker times than these, and somehow each generation of Americans carried us through to the other side, he said. Not by sitting around and waiting for something to happen, not by leaving it to others to do something, but by leading that movement for change themselves. And if you do that, if you get involved, and you get engaged, and you knock on some doors, and you talk with your friends, and you argue with your family members, and you change some minds, and you vote, something powerful happens."
const response = fetch('https://sentim-api.herokuapp.com/api/v1/', {
	method: 'post',
	body: { "text": t} ,
	headers: { Accept: "application/json", "Content-Type": "application/json"}
});
const data = response.json;
console.log(data);

app.listen(3000,(req, res)=>{
    console.log('Server running');
})