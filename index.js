const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const request = require("request")
const Keycloak = require('keycloak-connect')
const session = require('express-session')
const cirJSON = require('circular-json')

//set the view engine to hbs
app.set('views', path.join(__dirname,"templates"))
app.set("view engine", "hbs")

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


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> helper functions >>>>>>>>>>>>>>>>>>>


const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }
}

const keycloakData = (obj) => {
  key = obj[0]
  value = obj[1]
  const seen = new WeakSet()
      if (key === 'keycloak-token'){
        seen.add(value)
      }
    return seen
}


//>>>>>>>>>>>>>>>>>>>>>> routes >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

app.get('/', (req, res) => {
  res.render('index')
})


// >>>>>>>>>>>>>>>>>>>>>>>>> create route>>>>>>>>>>>>>>>>>>>>>>>>>
app.get('/create', (req, res) => {
    res.render('create')
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
  console.log("creating user")
  
  res.send("created user")
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
  const body = req.body
  var user_id = req.body.user_id_field
  var user_data = req.body.user_data_field
  cirRes = cirJSON.parse(cirJSON.stringify(res))
  allUser = []
  access_token = cirRes.req.kauth.grant.access_token.token
  if (user_id != null){
    user_data.enabled = true
    var options = { method: 'PUT',
  url: `http://localhost:8080/auth/admin/realms/create_user_realm/users/${ user_id }`,
  headers: 
   { 
     Accept: '*/*',
     Authorization: `Bearer ${ access_token }`,
     'Content-Type': 'application/json' },
  body: `${ user_data }`,
  json: true }
request(options, function (error, response, body) {
  if (error) throw new Error(error);
  console.log("user updated")
})

  }
  var options = { method: 'GET',
  url: 'http://localhost:8080/auth/admin/realms/create_user_realm/users',
  headers: 
   { 
     'Content-Type': 'application/x-www-form-urlencoded',
     Host: 'localhost:8080',
     Accept: '*/*',
     Authorization: `Bearer ${ access_token }` } }
  request(options, function (error, response, body) {
    if (error) { throw new Error(error) }
      data = JSON.parse(body)
      for (user in data){
       allUser.push(data[user])
      } 
      res.render('verifier', {"users": allUser})
    })
  if (res.statusCode != 200) {
    res.redirect('/logout')
  }
})


app.post("/verifier", keycloak.protect('verifier'), (req, res) => {
  var user_id = req.body.user_id_field
  var user_data = null
  console.log("this is post")
  cirRes = cirJSON.parse(cirJSON.stringify(res))        
  allUser = []
  access_token = cirRes.req.kauth.grant.access_token.token
  console.log(access_token)
  
  if (user_id != null){
    var options1 = { method: 'GET',
      url: `http://localhost:8080/auth/admin/realms/create_user_realm/users/${ user_id }`,
      headers: 
       { 
         Authorization: `Bearer ${ access_token }`,
         'Content-Type': 'application/json' },
         json: true }
    request(options1, function (error, response, body) {
      if (error) {
        console.log("no the error occured here")
        throw new Error(error)
      }
      console.log("the response of get")
      user_data = body
      user_data.enabled = true
      user_data = JSON.parse(JSON.stringify(user_data))
      access_data = JSON.parse(JSON.stringify(body.access))
      user_data.access = access_data

      console.log(user_data)
      var options = { method: 'PUT',
        url: `http://localhost:8080/auth/admin/realms/create_user_realm/users/${ user_id }`,
        headers: 
          { 
            Authorization: `Bearer ${ access_token }`,
            'Content-Type': 'application/json'},
            'body': user_data,
            json: true }
        console.log(options)
        request(options, function (error, response, body) {
          if (error) {
            console.log("an error occured")
            throw new Error(error)
          }
          console.log(`the body ${body}`)
          console.log(body)
          res.redirect('/verifier')
        })
     })
  } 
   
})


// >>>>>>>>>>>>>>> admin route >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

app.get("/admin", keycloak.protect('realm:admin'), (req, res) => {
  res.send("congrats you accessed a admin protected route")
})



app.listen(8000, () => {
  console.log("app listening on port 8000!")
})

