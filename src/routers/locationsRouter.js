const express = require('express')

const router = new express.Router()

const authUser = require('../middleware/auth')
const LocationRepo = require('../db/repos/locationRepo')

router.post('/locations', authUser, async(req, res, next) => {
    try{
        if(req.user.role == 0) {
            //Admin User
            if(req.user.company.toString() == req.body.company.toString()) {
                const response = await LocationRepo.SaveLocation(req.body)

                return res.status(response.statusCode).send(response)
            }

            return res.status(400).send({
                status: 'failed',
                error: 'You are not allowed to add location for this company!'
            })        
        } else {
            //Normal User
            if(!req.user.permissions) {
                return res.status(400).send({
                    status: 'failed',
                        error: 'You are not allowed to add location!'
                })
            }

            if(!req.user.permissions.includes('LOCATION_ADD')) {
                return res.status(400).send({
                    status: 'failed',
                        error: 'You are not allowed to add location!'
                })
            } 

            const response = await LocationRepo.SaveLocation(req.body)

            return res.status(response.statusCode).send(response)
        }
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/locations/:id', authUser, async(req, res, next) => {
    try{
        if(req.user.role === 0) {                
            const allowedUpdates = ['name', 'address', 'address1', 'city', 'state', 'postalCode', 'active']
            const response = await LocationRepo.UpdateLocation(req.params.id, req.user.company, req.body, allowedUpdates)

            return res.status(response.statusCode).send(response)
        }

        if(!req.user.permissions) {
            return res.status(400).send({
                status: 'failed',
                    error: 'You are not allowed to update location!'
            })
        }

        if(!req.user.permissions.includes('LOCATION_UPDATE')) {
            return res.status(400).send({
                status: 'failed',
                    error: 'You are not allowed to update location!'
            })
        }

        const allowedUpdates = ['address', 'address1', 'city', 'state', 'postalCode']
        const response = await LocationRepo.UpdateLocation(req.params.id, req.user.company, req.body, allowedUpdates)

        res.status(response.statusCode).send(response)
    }catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/location', authUser, async(req, res, next) => {
    try{
        const response = await LocationRepo.GetLocations(req.user.company, req.query.active)

        res.status(response.statusCode).send(response)
    }catch(e) {
        e.stausCode = 400
        next(e)
    }
})

router.get('/location/:id', authUser, async(req, res, next) => {
    try{
        const response = await LocationRepo.GetLoactionById(req.params.id)

        res.status(response.statusCode).send(response)
    }catch(e) {
        e.stausCode = 400
        next(e)
    }
})
module.exports = router