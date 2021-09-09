const mongoose = require('mongoose')

const screenSchema = new mongoose.Schema({
    name: {
        type: String,
        requied: '{PATH} is mandatory'
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        require: '{PATH} is mandatory',
        ref: 'Locations'
    },
    deviceType: {
        type: String,
        enum: ['desktop', 'android', 'smart'],
        default: 'desktop'
    },
    deviceResolution: {
        height: Number,
        width: Number,
        dpi: Number
    },
    advertise: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    deviceStatus: {
        type: String,
        enum: ['online', 'offline'],
        default: 'online'
    },
    deviceId: {
        type: String,
        default: '1'
    },
    active: {
        type: Boolean,
        default: true
    }
})

screenSchema.virtual('company', {
    ref: 'Companies',
    localField: '_id',
    foreignField: 'location'
})

screenSchema.methods.toJSON = function () {
    const screen = this
    const screenObject = screen.toObject()

    delete screenObject.__v

    return screenObject
}

const screenModel = mongoose.model('Screens', screenSchema)
module.exports = screenModel