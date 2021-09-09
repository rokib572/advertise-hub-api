const Company = require('../models/companyModel')
const Settings = require('../../utils/settings')
const mysqlCon = require('../mysql-connect')

const SaveCompany = async(data) => {
    if(Settings.useDB === 'MongoDB'){
        try{
            const company = new Company(data)
            
            await company.save()
            return {statusCode: 201, status: 'success', result: company}
        } catch(e){
            return {statusCode: 404, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })

            let sql = 'INSERT INTO companies SET ?'
            const company = new Company(data)
            const companyObj = company.toObject()
            delete companyObj._id
            
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, companyObj, (err, result) => {
                    if(err) {
                        console.log(err.message)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    companyObj['id'] = result.insertId
                    const success = {statusCode: 200, status: 'success', result: companyObj}

                    return resolve(success)                                        
                })
            })            
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else {
        return {statusCode:400, status: 'error', error: 'Invalid database!' }
    } 
}

const GetAllCompany = async() => {
    if(Settings.useDB === 'MongoDB') {
        try{
            const companies = await Company.find({})

            return {statusCode: 200, status: 'success', result: companies}
        }catch(e){
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })
            
            let sql = `SELECT * FROM companies`

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
        } catch (e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else {
        return {statusCode:400, status: 'error', error: 'Invalid database!' }
    }
}

const GetCompanyById = async(companyId) => {
    if(Settings.useDB === 'MongoDB') {
        try{
            const company = await Company.findById(companyId)
            
            if(!company) {
                return {statusCode: 404, status: 'error', error: 'Company not found!'}
            }
            return {statusCode: 200, status: 'success', result: company}
        }catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } if(Settings.useDB === 'mysql') {
        try {
            mysqlCon.connect((err) => {
                if(err) {
                    return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
                }
            })
            
            let sql = `SELECT * FROM companies WHERE id =${companyId}`

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

const GetCompanyByName = async(companyName)=> {
    if(Settings.useDB === 'MongoDB') {
        try {
            const company = await Company.findOne({ name: companyName })
            if(!company) {
                return {statusCode: 404, status: 'error', error: 'Company not found!' }
            }

            return {statusCode: 200, status: 'success', result: company}
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
            
            let sql = `SELECT * FROM companies WHERE name ='${companyName}'`


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
        } catch (e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else {
        return {statusCode:400, status: 'error', error: 'Invalid database!' }
    }
}

const UpdateCompanyLogo = async(companyId, logoPath) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const company = await Company.findById(companyId)
            company.logo = logoPath
            await company.save()

            return {statusCode: 200, status: 'success', result: company}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const company = await GetCompanyById(companyId)
            console.log(companyId)
            if(company.status !== 'success') {
                return {statusCode: 404, status: 'error', error: 'Compan not found!'}
            }
            
            let sql = `UPDATE companies SET logo='${logoPath}' WHERE id=${companyId}`
        
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, (err, results) => {                  
                    if(err) {
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    company.result[0].logo = logoPath
                    let success = {statusCode: 200, status: 'succes', result: company.result[0]}
                    return resolve(success)                                        
                })
            })

            
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

module.exports = {
    SaveCompany,
    GetAllCompany,
    GetCompanyById,
    GetCompanyByName,
    UpdateCompanyLogo
}