const mongoose = require('mongoose')
const Location = require('../models/locationsModel')
const Settings = require('../../utils/settings')
const mysqlCon = require('../mysql-connect')

const SaveLocation = async(data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            if(!data.name) {
                return {statusCode: 400, status: 'error', error: 'Invalid payload!'}
            }
            const curLocation = await Location.findOne({name: data.name})
            if(curLocation) {
                return {statusCode: 400, status: 'error', error: `A Location named ${data.name} already exists.`}
            }
            const location = new Location(data)
            await location.save()
            return { statusCode: 200, status: 'success', result: location }
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            if(!data.name) {
                return {statusCode: 400, status: 'error', error: 'Invalid payload!'}
            }

            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })

            const location = await GetLoactionByName(data.name)
            
            if(location.status === 'success') {
                return {statusCode: 400, status: 'error', error: `A Location named ${data.name} already exists.`}
            }

            let sql = 'INSERT INTO locations SET ?'
            const locationObj = data
            //const locationObj = location.toObject()
            delete locationObj._id
            
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, locationObj, (err, result) => {
                    if(err) {
                        console.log(err.message)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    console.log(locationObj)
                    locationObj['id'] = result.insertId
                    const success = {statusCode: 200, status: 'success', result: locationObj}

                    return resolve(success)                                        
                })
            })
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const UpdateLocation = async(locationId, companyId, data, allowedUpdates) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const updates = Object.keys(data)
            const location = await Location.findOne({
                _id: locationId,
                company: companyId
            })

            if(!location) {
                return {statusCode: 400, status: 'error', error: 'You are not allowed to update this location'}
            }

            const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

            if(!isValidOperation) {
                return {statusCode: 400, status: 'error', error: 'Invalid updates!'}
            }

            updates.forEach((update) => location[update] = data[update])
            await location.save()

            return {statusCode: 201, status: 'success', result: location}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const location = await GetLoactionById(locationId)

            if(location.status !== 'success') {
                return {statusCode: 404, status: 'error', error: 'Location not found!'}
            }
            
            const updates = Object.keys(data)
            const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

            if(!isValidOperation) {
                return {statusCode: 400, status: 'error', error: 'Invalid updates!'}
            }
            
            let sql = `UPDATE locations SET ? WHERE id=${locationId}`
            
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, data, (err, results) => {                   
                    if(err) {
                        console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''
                    
                    success = {statusCode: 200, status: 'success', result: location.result}

                    return resolve(success)                                        
                })
            })
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const GetLocations = async(companyId, activeParam) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            let locations = []

            if(activeParam) {
                locations = await Location.find({
                    company: companyId,
                    active: activeParam
                })
            } else {
                locations = await Location.find({
                    company: companyId
                })
            }

            if(locations.length === 0) {
                return {statusCode: 404, status: 'error', error: 'No locations found!'}
            }

            return {statusCode: 200, status: 'success', result: locations}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } if(Settings.useDB === 'mysql') {
        try {
            let sql = ''
            if(activeParam) {
                sql = `SELECT * FROM locations WHERE company ='${companyId}' AND active = ${activeParam}`
            } else {
                sql = `SELECT * FROM locations WHERE company ='${companyId}'`
            }
            
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
                        success = {statusCode: 404, status: 'failed', erro: 'No record found!'}
                    }  
                    return resolve(success)                                        
                })
            })
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const GetLoactionById = async(locationId) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const location = await Location.findOne({_id: locationId})

            if(location.length === 0) {
                return {statusCode: 404, status: 'error', error: 'Location not found!'}
            }

            return {statusCode: 200, status: 'success', result: location}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            let sql = `SELECT * FROM locations WHERE locations.id = ${locationId}`
        
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

const GetLoactionByName = async(locationName) => {    
    try {
        let sql = `SELECT * FROM locations WHERE locations.name = ?`
    
        return new Promise((resolve, reject) => {
            mysqlCon.query(sql, locationName, (err, results) => {
                if(err) {
                    console.log(err)
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


module.exports = {
    SaveLocation,
    UpdateLocation,
    GetLocations,
    GetLoactionById
}