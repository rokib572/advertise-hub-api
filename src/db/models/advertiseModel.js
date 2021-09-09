const mongoose = require('mongoose')

const advertiseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: '{PATH} is mandatory',
        unique: true
    },
    media: [{
        mediaType: {
            type: String,
            enum: ['image', 'video', 'document'],
            default: 'image'
        },
        mediaPath: {
            type: String
        },
        active: {
            type: Boolean,
            default: true
        }
    }],
    interval: {
        type: Number,
        required: '{PATH} is required',
        validate(value) {
            if(value < 0) {
                throw new Error('Interval must be a positive number')
            }
        }
    },
    transition: {
        type: Number,
        required: '{PATH} is required',
        validate(value) {
            if(value < 0) {
                throw new Error('Interval must be a positive number')
            }
        }
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        required : '{PATH} is mandatory'
    },
    active: {
        type: Boolean,
        default: true
    }
})

advertiseSchema.methods.toJSON = function () {
    const advertise = this
    const advertiseObject = advertise.toObject()

    delete advertiseObject.__v

    return advertiseObject
}

const advertiseModel = mongoose.model('Advertise', advertiseSchema)
module.exports = advertiseModel