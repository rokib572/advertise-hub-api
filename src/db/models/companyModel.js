const mongoose = require('mongoose')

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    address: {
        type: String,
        trim: true,
        required: true
    },
    city: {
        type: String,
        trim: true,
        required: true
    },
    state: {
        type: String,
        trim: true,
        required: true
    },
    country: {
        type: String,
        trim: true,
        required: true
    },
    website: {
        type: String,
        trim: true
    },
    logo: {
        type: String,
        trim: true,
        default: 'avatar.png'
    },
    active: {
        type: Boolean,
        trim: true,
        default: true
    }
})

companySchema.methods.toJSON = function () {
    const company = this
    const companyObject = company.toObject()

    delete companyObject.__v

    return companyObject
}

const companyModel = mongoose.model('Company', companySchema)

module.exports = companyModel