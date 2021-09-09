const jwt = require('jsonwebtoken')
const User = require('../db/models/userModel')
const Settings = require('../utils/settings')
const UserRepo = require('../db/repos/userRepo')

const auth = async(req, res, next) => {
    if(Settings.useDB === 'MongoDB') {
        try {
            const token = req.header('Authorization').replace('Bearer ', '')
            const decode = jwt.verify(token, Settings.secretKey)
            const user = await User.findOne({
                _id: decode._id,
                'tokens.token': token
            })
    
            if(!user) {
                throw new error()
            }
    
            req.token = token
            req.user = user
            next()
        } catch(e) {
            res.status(401).send({ error: 'Unauthorized' })
        }
    } else if(Settings.useDB === 'mysql') {
        try {
            const token = req.header('Authorization').replace('Bearer ', '')
            
            const response = await UserRepo.VerifyToken(token)
            
            if(response.status!== 'success') {
                return res.status(401).send({ error: 'Unauthorized' })
            }
            
            req.token = token
            req.user = response.result     
            next()
        } catch (e) {
            res.status(401).send({ error: 'Unauthorized' })
        }
    }    
}

module.exports = auth