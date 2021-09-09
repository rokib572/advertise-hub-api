const express = require('express')

const router = new express.Router()

const authUser = require('../middleware/auth')
const UserRepo = require('../db/repos/userRepo')

router.post('/company/register-user', async(req, res, next) => {
    try{
        const user = req.body
        const response = await UserRepo.SaveUser(user)
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.post('/user/login', async(req, res, next) => {
    try {
        const response = await UserRepo.findByCredentials(req.body.userName, req.body.password)

        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.post('/users/logout', authUser, async(req, res, next) => {
    try {
        const response = await UserRepo.LogoutUser(req.user._id, req.token)
        
        res.status(response.statusCode).send(response)
    } catch (e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/user/profile', authUser, async(req, res, next) => {
    try {
        if(req.user.permissions) {
            if(!Array.isArray(req.user.permissions)) {
                req.user.permissions = req.user.permissions.split(', ')
            }
        }
                
        res.send({
            status: 'success',
            result: req.user
        })
    } catch (e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/user/profile', authUser, async(req, res, next) => {
    try {
        const updates = Object.keys(req.body)
        if(req.user.role === 0) {
            const response = await UserRepo.UpdateUser(req.user._id, req.user, req.body)
            
            return res.status(response.statusCode).send(response)
        }
       
        const allowedUpdates = ['userFirstName', 'userLastName', 'password', 'email']
        const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

        if(!isValidOperation) {
            return res.status(400).send({
                status: 'failed',
                error: 'Invalid updates!'
            })
        }

        const response = await UserRepo.UpdateUser(req.user._id, req.user, req.body)
        
        res.statusCode(response.statusCode).send(response)
    } catch (e) {
        e.statusCode(400)
        next(e)
    }
})

router.post('/user/logoutall', authUser, async(req, res, next) => {
    try{
        req.user.tokens = []
        req.user.save()

        res.send({
            status: 'success'
        })
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

module.exports = router