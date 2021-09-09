//Get App Settings
const Settings = require('./utils/settings')

//Connect to DB
if(Settings.useDB === 'MongoDB') {
    require('./db/mongo-connect')
}

const express = require('express')
const companyRouter = require('./routers/companyRouter')
const userRouter = require('./routers/userRouter')
const locationRouter = require('./routers/locationsRouter')
const screenRouter = require('./routers/screensRouter')
const advertiseRouter = require('./routers/advertiseRouter')

const app = new express()
const port = process.env.Port || 3000

app.use(express.json())
app.use(companyRouter)
app.use(userRouter)
app.use(locationRouter)
app.use(screenRouter)
app.use(advertiseRouter)

app.all('*', (req, res, next) => {
    const err = new Error('Requested URL no found!')
    res.status(404).send({
        statusCode: 404,
        status: 'failed',
        error: err.message
    })
})

app.use((err, req, res, next) => {
    const statusCode = err.statusCode
    res.status(statusCode).send({
        statusCode : err.statusCode,
        status: 'failed',
        error: err.message,
        stack: err.stack
    })
})

app.listen(port, () => {
    console.log('Server started at localhost:' + port)
})