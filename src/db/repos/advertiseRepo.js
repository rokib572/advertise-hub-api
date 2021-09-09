const Advertise = require('../models/advertiseModel')
const Settings = require('../../utils/settings')
const mongoose = require('mongoose')
const mysqlCon = require('../mysql-connect')

const SaveAdvertise = async(data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const advertise = new Advertise(data)
            await advertise.save()
            return {statusCode: 200, status: 'success', result: advertise}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })

            let sql = 'INSERT INTO advertises SET ?'
            
            const advertiseObj = data
            
            delete advertiseObj._id
            
            if(advertiseObj.media) {
                advertiseObj.media = JSON.stringify(advertiseObj.media)
            }

            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, advertiseObj, (err, result) => {
                    if(err) {
                        console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    advertiseObj['id'] = result.insertId
                    const success = {statusCode: 200, status: 'success', result: advertiseObj}

                    return resolve(success)                                        
                })
            })   
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const UpdateAdvertise = async(advertiseId, companyId, data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const updates = Object.keys(data)
            const allowedUpdates = ['name', 'interval', 'transition', 'active']
            
            const advertise = await Advertise.findOne({
                _id: advertiseId,
                company: companyId
            })

            if(!advertise) {
                return {statusCode: 404, status: 'error', error: 'Advertise not found!'}
            }

            const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

            if(!isValidOperation) {
                return {statusCode: 400, status: 'error', error: 'Invalid updates!'}
            }

            updates.forEach((update) => advertise[update] = data[update])
            await advertise.save()

            return {statusCode: 200, status: 'success', result: advertise}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const updates = Object.keys(data)
            const allowedUpdates = ['name', 'interval', 'transition', 'active']
            
            const advertise = await GetAdvertiseById(advertiseId, companyId)

            if(advertise.status !== 'success') {
                return {statusCode: 404, status: 'error', error: 'Advertise not found!'}
            }

            const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

            if(!isValidOperation) {
                return {statusCode: 400, status: 'error', error: 'Invalid updates!'}
            }

            let sql = `UPDATE advertises SET ? WHERE id=${advertiseId}`

            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, data, (err, results) => {                   
                    if(err) {
                        console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    
                    success = {statusCode: 200, status: 'success', result: advertise.result}
                    return resolve(success)                                        
                })
            })
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const GetAdvertise = async(companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const advertise = await Advertise.aggregate([
                {
                    "$lookup": {
                        "from": "companies",
                        "localField": "company",
                        "foreignField": "_id",
                        "as": "advertiseCompany"
                    }
                },
                {
                  "$unwind": "$advertiseCompany"
                },
                {
                    "$match":{
                        "$and":[{"advertiseCompany._id" : companyId}]
                    }
                },
                {
                    "$project": {
                      "_id": 1,
                      "active": 1,
                      "name": 1,
                      "interval": 1,
                      "transition": 1,
                      "media": 1,
                      "companyName": "$advertiseCompany.name",
                      "companyId": "$advertiseCompany._id"
                    }
                  }
            ])
    
            if(advertise.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Advertise not found!'}
            }

            return {statusCode: 200, status: 'success', result: advertise}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })
            
            let sql = `SELECT * FROM advertises WHERE company =${companyId}`

            return new Promise((resolve, reject) => {
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
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const GetAdvertiseById = async(advertiseId, companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const advertise = await Advertise.aggregate([
                {
                    "$match":{
                        "_id" : mongoose.Types.ObjectId(advertiseId),
                        "company" : companyId
                    }
                },
                {
                  "$lookup": {
                    "from": "companies",
                    "localField": "company",
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
                    "name": 1,
                    "interval": 1,
                    "transition": 1,
                    "media": 1,
                    "company": "$screenCompany._id",
                    "companyName": "$screenCompany.name",
                    "active": 1
                  }
                }
            ])

            if(advertise.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Advertise not found!'}
            }

            return {statusCode: 200, status: 'success', result: advertise[0]}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })
            
            let sql = `SELECT * FROM advertises WHERE id =${advertiseId} AND company =${companyId}`

            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, (err, results) => {
                    if(err) {
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    const result = Object.values(JSON.parse(JSON.stringify(results)))

                    if(result.length > 0) {
                        success = {statusCode: 200, status: 'success', result: result[0]}
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
}

const GetAdvertiseByName = async(advertiseName, companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const advertise = await Advertise.aggregate([
                {
                    "$match":{
                        "name" : advertiseName,
                        "company" : companyId
                    }
                },
                {
                  "$lookup": {
                    "from": "companies",
                    "localField": "company",
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
                    "name": 1,
                    "interval": 1,
                    "transition": 1,
                    "media": 1,
                    "company": "$screenCompany._id",
                    "companyName": "$screenCompany.name",
                    "active": 1
                  }
                }
            ])

            if(advertise.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Advertise not found!'}
            }

            return {statusCode: 200, status: 'success', result: advertise}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })

            let sql = `SELECT * FROM advertises WHERE name =? AND company = ?`

            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, [advertiseName, companyId], (err, results) => {
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
}

module.exports = {
    SaveAdvertise,
    UpdateAdvertise,
    GetAdvertise,
    GetAdvertiseById,
    GetAdvertiseByName
}