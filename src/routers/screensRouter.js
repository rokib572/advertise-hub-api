const express = require('express')

const router = new express.Router()

const authUser = require('../middleware/auth')
const ScreenRepo = require('../db/repos/screenRepo')

router.post('/screens', authUser, async(req, res, next) => {
    try{
        if(req.user.role === 0) {
            const response = await ScreenRepo.SaveScreen(req.body)
            return res.status(response.statusCode).send(response)
        }

        if(req.user.permissions) {
            if(req.user.permissions.includes('SCREEN_ADD')){
                const response = await ScreenRepo.SaveScreen(req.body)
                return res.status(response.statusCode).send(response)
            }
        }   

        res.status(400).send({
            status: 'failed',
            error: 'You are not allowed to add screens!'
        })
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/screens/:id', authUser, async(req, res, next) => {
    try{
        if(req.user.role === 0) {
            const response = await ScreenRepo.UpdateScreen(req.params.id, req.user.company, req.body)
            return res.status(response.statusCode).send(response)
        }

        if(req.user.permissions) {
            if(req.user.permissions.includes('SCREEN_UPDATE')) {
                const response = await ScreenRepo.UpdateScreen(req.params.id, req.user.company, req.body)
                return res.status(response.statusCode).send(response)
            }
        }

        res.status(400).send({
            status: 'failed',
            error: 'You are not allowed to update this Screen'
        })
    }catch(e){
        e.statusCdoe = 400
        next(e)
    }
})

router.get('/screens', authUser, async(req, res, next) => {
    try{
        const response = await ScreenRepo.GetScreens(req.user.company)
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/screens/:id', authUser, async(req, res, next) => {
    try{
        const response = await ScreenRepo.GetScreenById(req.params.id, req.user.company)

        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/attach_advertise/:id', authUser, async(req, res, next) => {
    try {
        if(req.user.role === 0) {  
            const response = await ScreenRepo.AttachScreen(req.params.id, req.user.company, req.body)         
            return res.status(response.statusCode).send(response)
        }

        if(!req.user.permissions) {
            return res.status(400).send({
                status: 'failed',
                error: 'You are not allowed to update screen'
            })
        }

        if(!req.user.permissions.includes('UPDATE_SCREEN')) {
            return res.status(400).send({
                status: 'failed',
                error: 'You are not allowed to update screen'
            })
        }

        const response = await ScreenRepo.AttachScreen(req.params.id, req.user.id, req.body)         
        return res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/screens/:id/connect', authUser, async(req, res, next) => {
    try{
        if(req.user.role === 0) {
            const response = await ScreenRepo.UpdateScreen(req.params.id, req.user.company, req.body)
            return res.status(response.statusCode).send(response)
        }

        if(req.user.permissions) {
            if(req.user.permissions.includes('SCREEN_CONNECT')) {
                const response = await ScreenRepo.UpdateScreen(req.params.id, req.user.company, req.body)
                return res.status(response.statusCode).send(response)
            }
        }

        res.status(400).send({
            status: 'failed',
            error: 'You are not allowed to update this Screen'
        })
    }catch(e){
        e.statusCdoe = 400
        next(e)
    }
})

router.get('/getvacantscreens', authUser, async(req, res, next) => {
    try{
        const response = await ScreenRepo.GetVacantScreens(req.user.company)
        
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

module.exports = router