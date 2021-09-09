const mongoose = require('mongoose')

const locationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: '{PATH} missing',
        unique: true
    },
    address: {
        type: String
    },
    address1: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    postalCode: {
        type: String
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        required: '{PATH} is mandatory'
    },
    active: {
        type: Boolean,
        default: true
    }
})

locationSchema.methods.toJSON = function () {
    const location = this
    const locationObject = location.toObject()

    delete locationObject.__v

    return locationObject
}

const locationModel = mongoose.model('Locations', locationSchema)
module.exports = locationModel