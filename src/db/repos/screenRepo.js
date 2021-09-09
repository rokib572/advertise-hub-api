const Screen = require('../models/screensModel')
const Advertise = require('../models/advertiseModel')
const Settings = require('../../utils/settings')
const mongoose = require('mongoose')
const mysqlCon = require('../mysql-connect')

const SaveScreen = async(data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            if(!data.name) {
                return {statusCode: 400, status: 'error', error: 'Invalid Payload'}
            }

            let screen = await Screen.findOne({name: data.name})

            if(screen) {
                return {statusCode: 400, status: 'failed', error: 'A screen named ' + data.name + ' already exists'}
            }

            screen = new Screen(data)
            await screen.save()

            return {statusCode: 201, status: 'success', result: screen}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            if(!data.name) {
                return {statusCode: 400, status: 'error', error: 'Invalid Payload'}
            }

            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })
            
            const screen = await GetScreenByName(data.name)

            if(screen.status === 'success') {
                return {statusCode: 400, status: 'error', error: `A Screen named ${data.name} already exists.`}
            }

            let sql = 'INSERT INTO screens SET ?'

            const screenObj = data
            if(screenObj.deviceResolution) {
                screenObj.deviceResolution = JSON.stringify(screenObj.deviceResolution)
            }
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, screenObj, (err, result) => {
                    if(err) {
                        console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err}
                        return reject(error)
                    }
                    screenObj['id'] = result.insertId
                    const success = {statusCode: 200, status: 'success', result: screenObj}
    
                    return resolve(success)                                        
                })
            })
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }  
    }
}

const UpdateScreen = async(screenId, companyId, data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const updates = Object.keys(data)
            const screen = await Screen.aggregate([
                {
                    "$match":{
                        "_id" : mongoose.Types.ObjectId(screenId)
                    }
                },
                {
                  "$lookup": {
                    "from": "locations",
                    "localField": "location",
                    "foreignField": "_id",
                    "as": "screenLocation"
                  }
                },
                {
                  "$unwind": "$screenLocation"
                },
                {
                    "$match":{
                        "$and":[{"screenLocation.company" : companyId}]
                    }
                },
                {
                  "$lookup": {
                    "from": "companies",
                    "localField": "screenLocation.company",
                    "foreignField": "_id",
                    "as": "screenCompany"
                  }
                },
                {
                    "$unwind": "$screenCompany"
                },           
                {
                  "$project": {
                    "_id": 1,
                    "deviceType": 1,
                    "mediaType": 1,
                    "deviceStatus": 1,
                    "active": 1,
                    "name": 1,
                    "location": 1,
                    "deviceResolution": 1,
                    "company": "$screenCompany._id"
                  }
                }
            ])

            if(screen.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Screen not found!' }
            }

            const screenToUpdate = await Screen.findById(screenId)

            updates.forEach((update) => screenToUpdate[update] = data[update])
            await screenToUpdate.save()

            return {statusCode: 200, status: 'success', result: screenToUpdate}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const screen = await GetScreenById(screenId, companyId)
            
            if(screen.status !== 'success') {
                return {statusCode: 404, status: 'error', error: 'Screen not found!'}
            }
            
            if(data.deviceResolution) {
                data.deviceResolution = JSON.stringify(data.deviceResolution)
            }

            if(data.advertise) {
                data.advertise = data.advertise.join(', ')
                screen.advertis = data.advertise
            }

            let sql = `UPDATE screens SET ? WHERE id = ${screenId}`
            
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, data, (err, results) => {                  
                    if(err) {
                        //console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    screen.result[0].advertise = data.advertise
                    success = {statusCode: 200, status: 'success', result: screen.result[0]}

                    return resolve(success)                                        
                })
            })
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const GetScreens = async(companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const screen = await Screen.aggregate([
                {
                  "$lookup": {
                    "from": "locations",
                    "localField": "location",
                    "foreignField": "_id",
                    "as": "screenLocation"
                  }
                },
                {
                  "$unwind": "$screenLocation"
                },
                {
                    "$match":{
                        "$and":[{"screenLocation.company" : companyId}]
                    }
                },
                {
                  "$lookup": {
                    "from": "companies",
                    "localField": "screenLocation.company",
                    "foreignField": "_id",
                    "as": "screenCompany"
                  }
                },
                {
                    "$unwind": "$screenCompany"
                },
                {
                  "$project": {
                    "_id": 1,
                    "deviceType": 1,
                    "mediaType": 1,
                    "deviceStatus": 1,
                    "active": 1,
                    "name": 1,
                    "location": 1,
                    "advertise": 1,
                    "locationName": "$screenLocation.name",
                    "deviceResolution": 1,
                    "company": "$screenCompany._id",
                    "companyName": "$screenCompany.name"
                  }
                }
            ])
    
            if(screen.length === 0) {
                return {statusCode: 400, status: 'error', error: 'Screen not found!'}
            }
    
            for(var i=0,len=screen.length;i<len;i++){
                let adDetails= []
                if(screen[i].advertise) {
                    for(var j=0, leng=screen[i].advertise.length; j<leng; j++) {
                        const advertiseDetails = await Advertise.findById(screen[i].advertise[j])
                        advertiseDetails.company = undefined                       
                        adDetails.push(advertiseDetails)
                    }

                    if(adDetails.length>0) {
                        screen[i].advertiseDetails = adDetails
                    }                   
                } 
            }

            return {statusCode: 200, status: 'success', result: screen}
        } catch(e) {
            return {statusCode:400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            let sql = 'SELECT screens.`name`, screens.location, screens.deviceType, screens.deviceResolution, screens.advertise, screens.deviceStatus, screens.active, locations.`name` AS locationName, companies.id AS company, companies.`name` AS companyName FROM screens INNER JOIN locations ON screens.location = locations.id INNER JOIN companies ON locations.company = companies.id WHERE locations.company = ' + companyId

            const screenPromise = new Promise((resolve, reject) => {
                mysqlCon.query(sql, (err, results) => {
                    if(err) {
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    const result = Object.values(JSON.parse(JSON.stringify(results)))

                    if(result.length > 0) {
                        success = {statusCode: 200, status: 'success', result: result}
                    } else {
                        success = {statusCode: 404, status: 'failed'}
                    }  
                    return resolve(success)                                        
                })
            })

            const getScreens = await screenPromise

            for(var i=0,len=getScreens.result.length;i<len;i++){
                if(getScreens.result[i].advertise !== '') {
                    let adDetails= []

                    if(getScreens.result[i]) {
                        const adIds = getScreens.result[i].advertise.split(', ')
                        const getAds = await GetAdvertises(adIds)
    
                        if(getAds.status === 'success') {
                            adDetails.push(getAds.result)
                        }
    
                        if(adDetails.length > 0) {
                            getScreens.result[i].advertiseDetails = adDetails
                        } 
                    }
                }                
            }

            return getScreens
        } catch(e) {
            return {statusCode:400, status: 'error', error: e.message}
        }
    }
}

const GetScreenById = async(screenId, companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const screen = await Screen.aggregate([
                {
                    "$match":{
                        "_id" : mongoose.Types.ObjectId(screenId)
                    }
                },
                {
                  "$lookup": {
                    "from": "locations",
                    "localField": "location",
                    "foreignField": "_id",
                    "as": "screenLocation"
                  }
                },
                {
                  "$unwind": "$screenLocation"
                },
                {
                    "$match":{
                        "$and":[{"screenLocation.company" : companyId}]
                    }
                },
                {
                  "$lookup": {
                    "from": "companies",
                    "localField": "screenLocation.company",
                    "foreignField": "_id",
                    "as": "screenCompany"
                  }
                },
                {
                    "$unwind": "$screenCompany"
                },
                {
                    "$project": {
                        "_id": 1,
                        "deviceType": 1,
                        "deviceStatus": 1,
                        "active": 1,
                        "name": 1,
                        "location": 1,
                        "advertise": 1,
                        "locationName": "$screenLocation.name",
                        "deviceResolution": 1,
                        "company": "$screenCompany._id",
                        "companyName": "$screenCompany.name"
                      }
                }
            ])
    
            if(screen.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Screen not found!'}
            }
    
            for(var i=0,len=screen.length;i<len;i++){
                let adDetails= []
                if(screen[i].advertise) {
                    for(var j=0, leng=screen[i].advertise.length; j<leng; j++) {
                        const advertiseDetails = await Advertise.findById(screen[i].advertise[j])
                        advertiseDetails.company = undefined
                        adDetails.push(advertiseDetails)
                    }
                    if(adDetails.length > 0) {
                        screen[i].advertiseDetails = adDetails
                    }                    
                } 
            }

            return {statusCode: 200, status: 'success', result: screen}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            
            let sql = 'SELECT screens.`name`, screens.location, screens.deviceType, screens.deviceResolution, screens.advertise, screens.deviceStatus, screens.active, locations.`name` AS locationName, companies.id AS company, companies.`name` AS companyName FROM screens INNER JOIN locations ON screens.location = locations.id INNER JOIN companies ON locations.company = companies.id WHERE screens.id =' + screenId + ' AND locations.company = ' + companyId
            
            const screenPromise = new Promise((resolve, reject) => {
                mysqlCon.query(sql, (err, results) => {
                    if(err) {
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    const result = Object.values(JSON.parse(JSON.stringify(results)))

                    if(result.length > 0) {
                        success = {statusCode: 200, status: 'success', result: result}
                    } else {
                        success = {statusCode: 404, status: 'failed'}
                    }  
                    return resolve(success)                                        
                })
            })

            const getScreens = await screenPromise

            if(getScreens.result[0].advertise !== '') {
                for(var i=0,len=getScreens.result.length;i<len;i++){
                    let adDetails= []
    
                    if(getScreens.result[i]) {
                        const adIds = getScreens.result[i].advertise.split(', ')
                        const getAds = await GetAdvertises(adIds)
    
                        if(getAds.status === 'success') {
                            adDetails.push(getAds.result)
                        }
    
                        if(adDetails.length > 0) {
                            getScreens.result[i].advertiseDetails = adDetails
                        } 
                    }
                }
            }
            return getScreens
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const AttachScreen = async(screenId, companyId, data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const screen = await Screen.aggregate([
                {
                    "$match":{
                        "_id" : mongoose.Types.ObjectId(screenId),
                        "company": companyId
                    }
                },        
                {
                  "$project": {
                    "_id": 1,
                    "deviceType": 1,
                    "mediaType": 1,
                    "deviceStatus": 1,
                    "active": 1,
                    "name": 1,
                    "location": 1,
                    "deviceResolution": 1,
                    "company": 1
                  }
                }
            ])

            if(screen.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Screen not found!' }
            }

            const screenToUpdate = await Screen.findById(screenId)

            screenToUpdate.advertise.push(data.advertise)
            await screenToUpdate.save()

            return {statusCode: 200, status: 'success', result: screenToUpdate}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const response = await UpdateScreen(screenId, companyId, data)

            return response
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const GetAdvertises = async(advertiseIds) => {
    try {
        let sql = `SELECT * FROM advertises WHERE id in (${advertiseIds})`
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, (err, results) => {
                    if(err) {
                        console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    const result = Object.values(JSON.parse(JSON.stringify(results)))

                    if(result.length > 0) {
                        success = {statusCode: 200, status: 'success', result: result}
                    } else {
                        success = {statusCode: 404, status: 'failed'}
                    }  
                    return resolve(success)                                        
                })
            })
    } catch(e) {
        return {statusCode: 400, status: 'error', error: e.message}
    }
}

const GetScreenByName = async(screenName) => {
    try {
        let sql = 'SELECT * FROM screens WHERE screens.name = ?'

        return new Promise((resolve, reject) => {
            mysqlCon.query(sql, screenName, (err, results) => {
                if(err) {
                    const error = {statusCode: 400, status: 'error', error: err.message}
                    return reject(error)
                }
                
                let success = ''
                const result = Object.values(JSON.parse(JSON.stringify(results)))

                if(result.length > 0) {
                    success = {statusCode: 200, status: 'success', result: result}
                } else {
                    success = {statusCode: 404, status: 'failed'}
                }  
                return resolve(success)                                        
            })
        })
    } catch(e) {
        return {statusCode: 400, status: 'error', error: e.message}
    }
}

const GetVacantScreens = async(companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const screen = await Screen.aggregate([
                {
                    "$match":{
                        "deviceId" : '1'
                    }
                },
                {
                  "$lookup": {
                    "from": "locations",
                    "localField": "location",
                    "foreignField": "_id",
                    "as": "screenLocation"
                  }
                },
                {
                  "$unwind": "$screenLocation"
                },
                {
                    "$match":{
                        "$and":[{"screenLocation.company" : companyId}]
                    }
                },
                {
                  "$lookup": {
                    "from": "companies",
                    "localField": "screenLocation.company",
                    "foreignField": "_id",
                    "as": "screenCompany"
                  }
                },
                {
                    "$unwind": "$screenCompany"
                },
                {
                  "$project": {
                    "_id": 1,
                    "deviceType": 1,
                    "mediaType": 1,
                    "deviceStatus": 1,
                    "active": 1,
                    "name": 1,
                    "location": 1,
                    "advertise": 1,
                    "locationName": "$screenLocation.name",
                    "deviceResolution": 1,
                    "company": "$screenCompany._id",
                    "companyName": "$screenCompany.name"
                  }
                }
            ])
    
            if(screen.length === 0) {
                return {statusCode: 400, status: 'error', error: 'Screen not found!'}
            }

            for(var i=0,len=screen.length;i<len;i++){
                let adDetails= []
                if(screen[i].advertise) {
                    for(var j=0, leng=screen[i].advertise.length; j<leng; j++) {
                        const advertiseDetails = await Advertise.findById(screen[i].advertise[j])
                        advertiseDetails.company = undefined                       
                        adDetails.push(advertiseDetails)
                    }

                    if(adDetails.length>0) {
                        screen[i].advertiseDetails = adDetails
                    }                   
                } 
            }

            return {statusCode: 200, status: 'success', result: screen}
        } catch(e) {
            return {statusCode:400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            let sql = 'SELECT screens.`name`, screens.location, screens.deviceType, screens.deviceResolution, screens.advertise, screens.deviceStatus, screens.active, locations.`name` AS locationName, companies.id AS company, companies.`name` AS companyName FROM screens INNER JOIN locations ON screens.location = locations.id INNER JOIN companies ON locations.company = companies.id WHERE locations.company = ' + companyId + ' AND screens.deviceId = 1'
            
            const screenPromise = new Promise((resolve, reject) => {
                mysqlCon.query(sql, (err, results) => {
                    if(err) {
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    const result = Object.values(JSON.parse(JSON.stringify(results)))
                    
                    if(result.length > 0) {
                        success = {statusCode: 200, status: 'success', result: result}
                    } else {
                        success = {statusCode: 404, status: 'failed'}
                    }  
                    return resolve(success)                                        
                })
            })

            const getScreens = await screenPromise

            for(var i=0,len=getScreens.result.length;i<len;i++){
                if(getScreens.result[i].advertise !== '') {
                    let adDetails= []

                    if(getScreens.result[i]) {
                        const adIds = getScreens.result[i].advertise.split(', ')
                        const getAds = await GetAdvertises(adIds)
    
                        if(getAds.status === 'success') {
                            adDetails.push(getAds.result)
                        }
    
                        if(adDetails.length > 0) {
                            getScreens.result[i].advertiseDetails = adDetails
                        } 
                    }
                }                
            }

            return getScreens
        } catch(e) {
            return {statusCode:400, status: 'error', error: e.message}
        }
    }
}

module.exports = {
    SaveScreen,
    UpdateScreen,
    GetScreens,
    GetScreenById,
    AttachScreen,
    GetVacantScreens
}