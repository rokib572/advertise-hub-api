const express = require('express')

const router = new express.Router()

const AdvertiseRepo = require('../db/repos/advertiseRepo')
const path = require('path')

const authUser = require('../middleware/auth')
const Slugify = require('../middleware/slugify')
const multer = require('multer')
const fs = require('fs')
const AppError = require('../utils/AppError')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../media/advertises/', Slugify(req.body.name), '/')
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        cb(undefined, dest)
    },
    filename: (req, file, cb) => {
        cb(undefined, Date.now()+path.extname(file.originalname))
    }
})

const upload = multer({
    storage,
    async fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(jpg|jpeg|png|mpeg|avi|pdf)$/)) {
            return cb(new AppError('Please upload a valid media (jpg, jpeg, png, mpeg, avi, pdf).', 400))
        }

        if(req.user.role !== 0) {
            if(!req.user.permissions.includes('ADVERTISE_ADD')) {
                return cb(new AppError('You are not allowed to add Advertise', 400))
            }
        }
        const verifyPayload = await verifyBody(req.body)

        if(verifyPayload !== 'success') {
            return cb(new AppError(verifyPayload, 400), false)
        }

        cb(undefined, true)
    }
})

const verifyBody = async(payLoad) => {
    if(!payLoad) {
        return 'Payload Missing'
    }

    if(!payLoad.name) {
        return 'name is mandatory'
    }

    if(payLoad.interval < 0) {
        return 'interval must be positive number'
    }

    if(payLoad.transition < 0) {
        return 'transition must be positive number'
    }
    const advertise = await AdvertiseRepo.GetAdvertiseByName(payLoad.name, payLoad.company)

    if(advertise.status === 'success') {
        return 'An advertise named ' + payLoad.name + ' already exists'
    }

    return 'success'
}

router.post('/advertise', authUser, upload.array('media'), async(req, res, next) => {
    try {
        const advertise = req.body
        advertise['media'] = []
        req.files.forEach(element => {
            const objMedia = {}
            let mediaType = ''

            if(element.filename.match(/\.(jpg|jpeg|png)$/)) {
                mediaType = 'image'
            }else if(element.filename.match(/\.(mpeg|avi|mp4|wmv)$/)) {
                mediaType = 'video'
            } else {
                mediaType = 'documents'
            }

            objMedia["mediaType"] = mediaType
            objMedia["mediaPath"] = path.join('/media/advertises/', Slugify(advertise.name), "/", element.filename) 
            advertise['media'].push(objMedia)
        });
        
        if(req.user.role === 0) {             
            const response = await AdvertiseRepo.SaveAdvertise(advertise)
            return res.status(response.statusCode).send(response)
        }

        if(req.user.permissions) {
            if(req.user.permissions.includes('ADVERTISE_ADD')) {
                const response = await AdvertiseRepo.SaveAdvertise(req.body)
                return res.status(response.statusCode).send(response)
            }
        }

        res.status(400).send({
            status: 'failed',
            error: 'You are not allowed to add advertise!'
        })
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/advertise/:id', authUser, async(req, res, next) => {
    try{       
        if(req.user.role === 0) {            
            const response = await AdvertiseRepo.UpdateAdvertise(req.params.id, req.user.company, req.body)
            return res.status(response.statusCode).send(response)
        }

        if(!req.user.permissions) {
            return res.status(400).send({
                status: 'failed',
                error:'You are not allowed to update Advertise'
            })
        }

        if(!req.user.permissions.includes('ADVERTISE_UPDATE')) {
            return res.status(400).send({
                status: 'failed',
                error:'You are not allowed to update Advertise'
            })
        }

        const response = await AdvertiseRepo.UpdateAdvertise(req.params.id, req.user.company, req.body)
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/advertise', authUser, async(req, res, next) => {
    try{
        const response = await AdvertiseRepo.GetAdvertise(req.user.company)
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/advertise/:id', authUser, async(req, res, next) => {
    try{
        const response = await AdvertiseRepo.GetAdvertiseById(req.params.id, req.user.company)
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/:path/:path1/:path2/:file', async(req, res, next) => {
    try {
        const filePath = path.join(__dirname,'../', req.params.path, '/', req.params.path1, '/', req.params.path2, '/', req.params.file)
        res.sendFile(filePath)
    } catch(e) {
       e.statusCode = 400
       next(e) 
    }
})

module.exports = router