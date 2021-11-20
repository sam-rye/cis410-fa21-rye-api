const jwt = require("jsonwebtoken");
const db = require("../dbConnectExec.js");
const rockwellConfig = require("../config.js");

const auth = async (req, res, next) => {
  //console.log("in the middleware", req.header("Authorization"));
  //next();

  try {
    //1. decode token
    let myToken = req.header("Authorization").replace("Bearer ", "");
    //console.log("token", myToken);

    let decoded = jwt.verify(myToken, rockwellConfig.JWT);
    console.log(decoded);

    let customerPK = decoded.pk;

    //2. compare token with database
    let query = `SELECT CustomerPK, NameFirst, NameLast, Email
    FROM Attendee
    WHERE CustomerPK =${customerPK} and Token = '${myToken}'`;

    let returnedUser = await db.executeQuery(query);
    console.log("returned user", returnedUser);

    //3. save user information in the request

    if (returnedUser[0]) {
      req.customer = returnedUser[0];
      next();
    } else {
      return res.status(401).send("Invalid credentials");
    }
  } catch (err) {
    console.log(err);
    return res.status(401).send("Invalid credentials");
  }
};

module.exports = auth;
