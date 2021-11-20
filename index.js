const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./dbConnectExec.js");
const rockwellConfig = require("./config.js");
const auth = require("./middleware/authenticate");

const app = express();
app.use(express.json());

//azurewebsites.net, colostate.edu
app.use(cors());
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("app is running on port ${PORT}");
});

app.get("/hi", (req, res) => {
  res.send("hello world");
});

app.get("/", (req, res) => {
  res.send("API is running");
});

//app.post()
//app.put()

//following has to be converted for project
app.post("/ticket", auth, async (req, res) => {
  try {
    let price = req.body.price;
    let concertFK = req.body.concertFK;

    if (!price || !concertFK) {
      return res.status(400).send("bad request");
    }

    //summery = summery.replace("'", "''");

    //console.log("summary", summary);
    //console.log("here is the customer", req.customer);

    let insertQuery = `INSERT INTO ticket(Price, ConcertFK, CustomerFK)
    OUTPUT inserted.TicketPK, inserted.Price, inserted.ConcertFK
    VALUES('${price}','${concertFK}',${req.customer.CustomerPK})`;

    let insertedTicket = await db.executeQuery(insertQuery);
    //console.log("inserted review", insertedReview);
    //res.send("here is the response");
    res.status(201).send(insertedTicket[0]);
  } catch (err) {
    console.log("error in POST /ticket", err);
    res.status(500).send();
  }
});

app.get("/attendee/me", auth, (req, res) => {
  res.send(req.customer);
});

app.post("/attendee/login", async (req, res) => {
  //console.log("/attendee/login called", req.body);
  //1. data validation

  let email = req.body.email;
  let password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Bad request");
  }

  //2. check that user exists in DB

  let query = `SELECT *
  FROM Attendee
  WHERE Email = '${email}'`;

  let result;
  try {
    result = await db.executeQuery(query);
  } catch (myError) {
    console.log("error in /attendee/login", myError);
    return res.status(500).send();
  }
  //console.log("result", result);

  if (!result[0]) {
    return res.status(401).send("Invalid user credentials");
  }
  //3. check password

  let user = result[0];

  if (!bcrypt.compareSync(password, user.Password)) {
    console.log("invalid password");
    return res.status(401).send("Invalid user credentials");
  }

  //4. generate token

  let token = jwt.sign({ pk: user.CustomerPK }, rockwellConfig.JWT, {
    expiresIn: "60 minutes",
  });
  //console.log("token", token);

  //5. save token in DB and send response

  let setTokenQuery = `UPDATE Attendee
SET token = '${token}'
WHERE CustomerPK = ${user.CustomerPK}`;

  try {
    await db.executeQuery(setTokenQuery);

    res.status(200).send({
      token: token,
      user: {
        NameFirst: user.NameFirst,
        NameLast: user.NameLast,
        Email: user.Email,
        CustomerPK: user.CustomerPK,
      },
    });
  } catch (myError) {
    console.log("error in setting user token", myError);
    res.status(500).send();
  }
});

app.post("/attendee", async (req, res) => {
  //res.send("/attendee called");

  //console.log("request body", req.body);

  let nameFirst = req.body.nameFirst;
  let nameLast = req.body.nameLast;
  let email = req.body.email;
  let phone = req.body.phone;
  let billingAddress = req.body.billingAddress;
  let password = req.body.password;

  if (
    !nameFirst ||
    !nameLast ||
    !email ||
    !phone ||
    !billingAddress ||
    !password
  ) {
    return res.status(400).send("Bad request");
  }

  nameFirst = nameFirst.replace("'", "''");
  nameLast = nameLast.replace("'", "''");

  let emailCheckQuery = `SELECT email
  FROM Attendee
  WHERE email = '${email}'`;

  let existingUser = await db.executeQuery(emailCheckQuery);

  //console.log("existing user", existingUser);

  if (existingUser[0]) {
    return res.status(409).send("Duplicate email");
  }

  let hashedPassword = bcrypt.hashSync(password);

  let insertQuery = `INSERT INTO Attendee(NameFirst, NameLast, Email, Phone, BillingAddress, Password)
  VALUES('${nameFirst}','${nameLast}','${email}','${phone}','${billingAddress}','${hashedPassword}')`;

  db.executeQuery(insertQuery)
    .then(() => {
      res.status(201).send();
    })
    .catch((err) => {
      console.log("error in POST / attendee", err);
      res.status(500).send();
    });
});

app.get("/concert", (req, res) => {
  //get data from the database
  db.executeQuery(
    `SELECT * 
    FROM Concert
    LEFT JOIN Venue
    ON Venue.VenuePK = Concert.VenueFK`
  )
    .then((theResults) => {
      res.status(200).send(theResults);
    })
    .catch((myError) => {
      console.log(myError);
      res.status(500).send();
    });
});

app.get("/concert/:pk", (req, res) => {
  let pk = req.params.pk;
  //console.log(pk);
  let myQuery = `SELECT * 
  FROM Concert
  LEFT JOIN Venue
  ON Venue.VenuePK = Concert.VenueFK
  WHERE ConcertPK = ${pk}`;

  db.executeQuery(myQuery)
    .then((result) => {
      //console.log("result", result);
      if (result[0]) {
        res.send(result[0]);
      } else {
        res.status(404).send(`bad request`);
      }
    })
    .catch((err) => {
      console.log("Error in /concert/:pk", err);
      res.status(500).send();
    });
});
