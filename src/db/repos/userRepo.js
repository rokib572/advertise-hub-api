const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const mysqlCon = require('../mysql-connect')
const User = require('../models/userModel')
const Settings = require('../../utils/settings')

const SaveUser = async(data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const user = new User(data)

            await user.save()
            return {statusCode: 201, status: 'success', result: user}
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
            
            const userVerify = await VerifyUser(data.userName, data.email)

            if(userVerify.status !== 'success') {
                let sql = 'INSERT INTO users SET ?'
    
                const userObj = data

                //Convert arrays to comma separate list
                if(userObj.permissions) {
                    userObj.permissions = userObj.permissions.join(", ")
                }
                //Generate password hash
                userObj.password = await bcrypt.hash(userObj.password, 8)
                
                return new Promise((resolve, reject) => {
                    mysqlCon.query(sql, userObj, (err, result) => {
                        if(err) {
                            const error = {statusCode: 400, status: 'error', error: err}
                            return reject(error)
                        }
                        userObj['id'] = result.insertId
                        const success = {statusCode: 200, status: 'success', result: userObj}
        
                        return resolve(success)                                        
                    })
                })
            }

            return {statusCode: 400, status: 'error', error: 'User Name or email already taken, please choose another User Name or Email'}
            
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }        
    } else {
        return {statusCode:400, status: 'error', error: 'Invalid database!' }
    }
}

const UpdateUser = async(userId, userObj, data) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const user = await User.findOne({_id: userId, company: userObj.company})

            if(!user) {
                return {statusCode: 404, status: 'error', error: 'user not found!'}
            }

            const updates = Object.keys(data)

            updates.forEach((item) => user[item] = data[item])

            await user.save()
            
            return {statusCode: 200, status: 'success', result: user}
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const user = await GetUserById(userId)

            if(user.status !== 'success') {
                return {statusCode: 404, status: 'error', error: 'User not found!'}
            }
            
            if(data.permissions) {
                data.permissions = data.permissions.join(', ')
            }
            let sql = `UPDATE users SET ? WHERE id=${userId}`
            
            return new Promise((resolve, reject) => {
                mysqlCon.query(sql, data, (err, results) => {                   
                    if(err) {
                        console.log(err)
                        const error = {statusCode: 400, status: 'error', error: err.message}
                        return reject(error)
                    }
                    
                    let success = ''

                    const result = Object.values(JSON.parse(JSON.stringify(results)))

                    if(result.length > 0) {
                        if(user.result[0].permissions) {
                            user.result[0].permissions = data.permissions.split(', ')
                        }                       
                        delete user.result[0].password
                        success = {statusCode: 200, status: 'success', result: user.result[0]}
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

const findByCredentials = async(userName, password) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const user = await User.findOne({ userName })

            if(!user) {
                return {statusCode: 400, status: 'error', error: 'Invalid credentials!'}
            }

            const isMatch = await bcrypt.compare(password, user.password)

            if(!isMatch) {
                return {statusCode: 400, status: 'error', error: 'Invalid credentials!'}
            }

            const response = await generateAuthToken(user._id)

            if(response.status !== 'success') {
                return {statusCode: 400, status: 'error', error: 'Invalid credentials!'}
            }

            const token = response.result
            return {statusCode: 200, status: 'success', result: {user, token}}
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
            
            const user = await GetUserByUserName(userName)

            if(user.status !== 'success') {
                return {statusCode: 400, status: 'error', error: 'Username or password invalid!'}
            }
            
            const token = jwt.sign({ id: user.result[0].id.toString() }, Settings.secretKey)

            const isMatch = await bcrypt.compare(password, user.result[0].password)
            
            if(!isMatch) {
                return {statusCode: 400, status: 'error', error: 'Username or password invalid!'}
            }

            const tokenResponse = await SaveTokens(user.result[0].id, token)

            if(tokenResponse.status !== 'success') {
                return {statusCode: 400, status: 'error', error: tokenResponse.error}
            }

            delete user.result[0].password
            if(user.result[0].permissions) {
                user.result[0].permissions = user.result[0].permissions.split(', ')
            }            
            return {statusCode: 200, status: 'success', result: {user: user.result[0], token}}
            
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
    }
}

const LogoutUser = async(userId, userToken) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const user = await User.findById(userId)
            user.tokens = user.tokens.filter((token) => {
                return token.token !== userToken
            })

            await user.save()

            return { statusCode: 200, status: 'success' }
        } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
        }
     } else if(Settings.useDB === 'mysql') {
         try {
            return await ResetToken(userId, userToken)
         } catch(e) {
            return {statusCode: 400, status: 'error', error: e.message}
         }
     }
}

const generateAuthToken = async(userId) => {
    try {
        const user = await User.findById(userId)

        if(!user) {
            return {statusCode: 400, status: 'error', result: 'Invalid credentials!'}
        }
        const token = jwt.sign({_id: user._id.toString() }, Settings.secretKey)
        user.tokens = user.tokens.concat({ token })
        await user.save()
        return {status: 'success', result: token}
    } catch(e) {
        return {status: 'error', error: e.message}
    }
    
}

const VerifyUser = async(userName, email) => {
    try {
        mysqlCon.connect((err) => {
            if(err) {
                return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
            }
        })
        
        let sql = `SELECT * FROM users WHERE (userName ='${userName}' or email ='${email}')`

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
}

const GetUserById = async(userId) => {
    try {
        let sql = `SELECT * FROM users WHERE id ='${userId}'`


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

const VerifyToken = async(token, option = null) => {
    try {
        let sql = ''

        if(option) {
            sql = `SELECT users.id AS _id, users.userName, users.email, users.userFirstName, users.userLastName, users.company, users.permissions, users.role, users.active FROM tokens INNER JOIN users ON tokens.user_id = users.id WHERE tokens.token = '${token}' AND users.role = 0`
        } else {
            sql = `SELECT users.id AS _id, users.userName, users.email, users.userFirstName, users.userLastName, users.company, users.permissions, users.role, users.active FROM tokens INNER JOIN users ON tokens.user_id = users.id WHERE tokens.token = '${token}'`
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

const GetUserByUserName = async(userName) => {
    try {
        let sql = `SELECT * FROM users WHERE userName ='${userName}'`


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

const SaveTokens = async(userId, token) => {
    try {
        mysqlCon.connect((err) => {
            if(err) {
                return {statusCode: 400, status: 'error', error: 'Connection to the database server failed!'}
            }
        })
        const createdAt = new Date()
        const expireAt = new Date()
        expireAt.setDate(expireAt.getDate() + 7)
        const tokens = {
            token,
            user_id: userId,
            created_at: createdAt,
            expire_at: expireAt
        }

        let sql = 'INSERT INTO tokens SET ?'
        
        return new Promise((resolve, reject) => {
            mysqlCon.query(sql, tokens, (err, result) => {
                if(err) {
                    console.log(err.message)
                    const error = {statusCode: 400, status: 'error', error: err.message}
                    return reject(error)
                }
                tokens['id'] = result.insertId
                const success = {statusCode: 200, status: 'success', result: tokens}

                return resolve(success)                                        
            })
        })
    } catch(e) {
        return {statusCode: 400, status: 'error', error: e.error}
    }
}

const ResetToken = async(userId, token, options = null) => {
    try {
        const user = await GetUserById(userId)

        if(user.status !== 'success') {
            return {statusCode: 404, status: 'error', error: 'User not found!'}
        }
        
        let sql = `DELETE FROM tokens WHERE token = '` + token + `'`
        
        return new Promise((resolve, reject) => {
            mysqlCon.query(sql, (err, results) => {                   
                if(err) {
                    const error = {statusCode: 400, status: 'error', error: err.message}
                    return reject(error)
                }
                
                let success = ''
                const result = Object.values(JSON.parse(JSON.stringify(results)))

                if(result.length > 0) {
                    success = {statusCode: 200, status: 'success'}
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
    SaveUser,
    UpdateUser,
    findByCredentials,
    LogoutUser,
    VerifyToken
}