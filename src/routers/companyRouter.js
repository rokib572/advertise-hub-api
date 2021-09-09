const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

const router = new express.Router()

const AppError = require('../utils/AppError')
const Slugify = require('../middleware/slugify')

const CompanyRepo = require('../db/repos/companyRepo')
const UserRepo = require('../db/repos/userRepo')

const authAdmin = require('../middleware/authAdmin')
const authUser = require('../middleware/auth')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../media/companies/', Slugify(req.body.name), '/')
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
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new AppError('Please upload a valid image (jpg, jpeg, png).', 400))
        }

        const verifyPayload = await verifyBody(req.body)
        if(verifyPayload !== 'success') {
            return cb(new AppError(verifyPayload, 400), false)
        }

        cb(undefined, true)
    }
})

const uploadLogo = multer({
    storage,
    async fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new AppError('Please upload a valid image (jpg, jpeg, png).', 400))
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

    if(!payLoad.address) {
        return 'address is mandatory'
    }

    if(!payLoad.city) {
        return 'city is mandatory'
    }

    if(!payLoad.state) {
        return 'state is mandatory'
    }

    if(!payLoad.country) {
        return 'country is mandatory'
    }

    const company = await CompanyRepo.GetCompanyByName(payLoad.name)

    if(company.status === 'success') {
        return 'A company named ' + payLoad.name + ' already exists'
    }

    return 'success'
}

router.post('/company-register', upload.single('logo'), async(req, res, next) => {
    try{
        const company = req.body
        
        if(req.file) {
            company.logo = path.join('/media/companies/', Slugify(company.name), "/", req.file.filename)
        }
        const response = await CompanyRepo.SaveCompany(company)  
        
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/companies', authAdmin, async(req, res, next) => {
    try{
        const response = await CompanyRepo.GetAllCompany()

        res.status(response.statusCode).send(response)
    } catch (e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/user/companies', authUser, async(req, res, next) => {
    try{
        const response = await CompanyRepo.GetCompanyById(req.user.company)

        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.get('/company/:id', authAdmin, async(req, res, next) => {
    try{
        const response = await CompanyRepo.GetCompanyById(req.params.id)

        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/company/logo', authAdmin, uploadLogo.single('logo'), async(req, res, next) => {
    try{
        if(!req.file) {
            return res.status(400).send({
                statusCode: 400,
                status: 'failed',
                error: 'logo missing!'
            })
        }

        const response = await CompanyRepo.UpdateCompanyLogo(req.user.company, path.join('/media/companies/', Slugify(req.body.name), "/", req.file.filename))
        
        res.status(response.statusCode).send(response)
    }catch(e){
        e.statusCode = 400
        next(e)
    }
})

router.patch('/company/user/:id', authAdmin, async(req, res, next) => {
    try{
        const updates = Object.keys(req.body)
        const allowedUpdates = ['userFirstName', 'userLastName', 'password', 'email', 'userName', 'active', 'permissions', 'role']
        const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

        if(!isValidOperation) {
            return res.status(400).send({
                status: 'failed',
                error: 'Invalid updates!'
            })
        }

        const response = await UserRepo.UpdateUser(req.params.id, req.user, req.body)

        if(response.status !== 'success') {
            return res.status(response.statusCode).send(response)
        }

        res.send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

router.patch('/company/user/:id/permissions', authAdmin, async(req, res, next) => {
    try{
        const updates = Object.keys(req.body)
        const allowedUpdates = ['permissions']
        const isValidOperation = updates.every((update) =>allowedUpdates.includes(update))

        if(!isValidOperation) {
            return res.status(400).send({
                status: 'failed',
                error: 'Invalid updates!'
            })
        }

        const response = await UserRepo.UpdateUser(req.params.id, req.user, req.body)
        res.status(response.statusCode).send(response)
    } catch(e) {
        e.statusCode = 400
        next(e)
    }
})

module.exports = router