const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const request = require("request")
const Keycloak = require('keycloak-connect')
const session = require('express-session')

//create an in memory store for node adapter

var memoryStore = new session.MemoryStore()
var keycloak = new Keycloak({ store: memoryStore })

//session
app.use(session({
  secret: 'putASecretHere',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}))

app.use(keycloak.middleware ( { logout: '/logout'} ))


app.use(bodyParser.urlencoded({ extended: false }))



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname+'/templates/index.html'))
})


// >>>>>>>>>>>>>>>>>>>>>>>>> create route>>>>>>>>>>>>>>>>>>>>>>>>>
app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname+'/templates/create.html'))
})

app.post('/create', (req, res) => {
  const body = req.body
  var user_name = req.body.user_name_field
  var password = req.body.password_field
  var email_adress = req.body.email_adress

  var options = { method: 'POST',
    url: 'http://localhost:8080/auth/realms/master/protocol/openid-connect/token',
    headers:
      {  'Content-Type': 'application/x-www-form-urlencoded' },
    form:
      {  username: 'admin',
         password: 'admin',
         grant_type: 'password',
         client_id: 'admin-cli' }
  }
  request(options, function (error, response, body) 
  {
    if (error) throw new Error(error)
    const Body = JSON.parse(body)
    var access_token = Body.access_token
    console.log(`the body ${ body }`)
    console.log(`the acess token ${ access_token}`)
    console.log(`the response ${response}`)
    var option = { method: 'POST',
      url: 'http://localhost:8080/auth/admin/realms/create_user_realm/users',
      headers:
        { 'Authorization': `Bearer ${ access_token }`,  
          'content-type': 'application/json' },
      body: { "username": user_name, "credentials": [{ "value": password }] },
      json: true };
   request(option, function (error, response, body) {
      if (error) throw new Error(error);
      console.log(body)
      console.log("user created")
  })
  })

   

  console.log(user_name)
  console.log(password)
  console.log("creating user")
  
  res.send("creating user")
})





// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> get detail >>>>>>>>>>>>>>>>

app.get("/get-detail", (req, res) => {
  res.send("this is the get user detail page, will require user to login to get correct deatil")
})


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>> protected route >>>>>>>>>>>>>>>>>>>>>


app.get("/protected", keycloak.protect(), (req, res) => {
  console.log(res)
  if (res.statusCode != 200){
    res.redirect('/logout')
  }
  res.send("congrats you have accesed a protected route")
})

// >>>>>>>>>>>>>>>>>>>>>>>>> verifier router >>>>>>>>>>>>>>>>>>>>>>>>>>>

app.get("/verifier", keycloak.protect('verifier'), (req, res) => {
  console.log("i was called")
  console.log(res)
  if (res.statusCode != 200) {
    res.redirect('/logout')
  }
  res.sendFile(path.join(__dirname+'/templates/verifier.html'))
})

app.listen(8000, () => {
  console.log("app listening on port 8000!")
})

