var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var randomstring = require("randomstring");
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var db;

db = new sqlite3.Database('./db_pasta.db');
db.run(
`CREATE TABLE IF NOT EXISTS pastes (
    id INTEGER PRIMARY KEY,
    newpaste TEXT,
    syntaxhi TEXT,
    pasteex TEXT,
    pasteexpos TEXT,
    title TEXT,
    pasteperm TEXT,
    pastemanagerperm TEXT,
    hits INTEGER
);`, function(){
    db.each("SELECT * from pastes", function(err, row) {
        console.log("scheduling the timeout for: " + row.title);
        setTimeout(function(){
            console.log("deleting the row automatically...");
            db.run("DELETE FROM pastes WHERE id = '" + row.id + "'");
            console.log("deleted the row automatically...");
        }, textToMS(row.pasteex));
    });
}); 

app.set('view engine', 'ejs');
app.set('view options', {
    rmWhitespace: true
});

app.use('/views', express.static(__dirname + '/views/'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    db.all("SELECT * FROM pastes WHERE pasteexpos='Public' LIMIT 20", function(err, rows) {
        res.render('home', { 
            therows : rows,
            hostname: getBaseURL(req)
        });
    });
});

app.get('/trends', function (req, res) {
    db.all("SELECT * FROM pastes WHERE pasteexpos='Public' ORDER BY hits DESC LIMIT 20", function(err, rows) {
        res.render('trends', { 
            therows : rows,
            hostname: getBaseURL(req)
        });
    });
});

app.post('/new-paste', function(req, res) {
    var generatedManageID = randomstring.generate({
        length: 7,
        charset: 'alphabetic',
        capitalization : 'lowercase'
    });

    var generatedPasteID = randomstring.generate({
        length: 7,
        charset: 'alphabetic',
        capitalization : 'lowercase'
    });

    db.run(
        `INSERT INTO pastes (newpaste, syntaxhi, pasteex, pasteexpos, title, pasteperm, pastemanagerperm, hits) VALUES (?,?,?,?,?,?,?,?)`,
        req.body.pcTaNewpaste,
        req.body.pcSlSyntaxhi,
        req.body.pcSlPasteex,
        req.body.pcSlPasteexpos,
        req.body.pcTxTitle == "" ? "Untitled" : req.body.pcTxTitle,
        generatedPasteID,
        generatedManageID,
        0
    );
    
    setTimeout(function(){
        console.log("deleting the row automatically...");
        db.run("DELETE FROM pastes WHERE pastemanagerperm = '" + generatedManageID + "'");
        console.log("deleted the row automatically...");
    }, textToMS(req.body.pcSlPasteex));

    res.redirect("/manage/"+ generatedManageID);
});

app.post('/manage/save-paste/:manageID', function(req, res) {
    db.run(
        "UPDATE pastes SET newpaste=?,syntaxhi=?,pasteex=?,pasteexpos=?,title=? WHERE pastemanagerperm=?",
        req.body.pcTaNewpaste,
        req.body.pcSlSyntaxhi,
        req.body.pcSlPasteex,
        req.body.pcSlPasteexpos,
        req.body.pcTxTitle == "" ? "Untitled" : req.body.pcTxTitle,
        req.params.manageID
    );

    console.log("saved: " + req.params.manageID);

    setTimeout(function(){
        console.log("deleting the row automatically...");
        db.run("DELETE FROM pastes WHERE pastemanagerperm = '" + req.params.manageID + "'");
        console.log("deleted the row automatically...");
    }, textToMS(req.body.pcSlPasteex));

    res.redirect("/manage/"+ req.params.manageID);
});

app.post('/manage/delete-paste/:manageID', function(req, res) {
    db.run("DELETE FROM pastes WHERE pastemanagerperm = '" + req.params.manageID + "'");
    console.log("deleted: " + req.params.manageID);
    res.redirect("/");
});

app.get('/manage/:manageID', function (req, res) {
    db.all("SELECT * FROM pastes WHERE pastemanagerperm = '" + req.params.manageID + "'", function(err, rows) {
        if(rows.length > 0){
            res.render('manage', { 
                therows : rows,
                hostname: getBaseURL(req)
            });
        }else{
            res.status(404);
            res.render('404');
        }
    });
})

app.get('/paste/:pasteID', function (req, res) {
    db.run(
        "UPDATE pastes SET hits=hits+1 WHERE pasteperm=?",
        req.params.pasteID
    );

    db.all("SELECT * FROM pastes WHERE pasteperm = '" + req.params.pasteID + "'", function(err, rows) {
        if(rows.length > 0){
            res.render('paste', { 
                therows : rows,
                hostname: getBaseURL(req)
            });
        }else{
            res.status(404);
            res.render('404');
        }
    });
})

app.get('*', function(req, res){
    res.status(404);
    res.render('404');
});

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

function textToMS(textTime){
    if(textTime == "1 Day"){
        return 24 * 60 * 60 * 1000;
    } else if(textTime == "12 Hours") {
        return 12 * 60 * 60 * 1000;
    } else if(textTime == "3 Hours") {
        return 3 * 60 * 60 * 1000;
    } else if(textTime == "30 Minutes") {
        return 30 * 60 * 1000;
    } else if(textTime == "2 Minutes") {
        return 2 * 60 * 1000;
    }
}

function getBaseURL(req){
    var port = app.get('port');
    var trailing = port == 80 || port == 443 ? "": (":" + port);
    return (req.secure?'https://':'http://') + req.hostname + trailing;

    //Jika Anda men-deploy aplikasi ini di heroku, replace kode
    //di atas dengan ini:
    //return "https://namasubdomainanda.herokuapp.com";
    //misalnya (yang punya saya):
    //return "https://ls-node-js-pasta.herokuapp.com";
}