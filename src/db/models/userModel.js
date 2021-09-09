const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const validator = require('validator')

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 6,
        validate(value) {
            if(value.toLowerCase().includes('password')) {
                throw new Error('Password must not contains the word "password"')
            }
        }
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    userFirstName: {
        type: String,
        trim: true,
        required: true
    },
    userLastName: {
        type: String,
        trim: true,
        required: true
    },
    role: {
        type: Number,
        default: 1
    },
    permissions: [{
        type: String,
        default: null
    }],
    tokens:[{
        token: {
            type: String,
            required: true
        }
    }],
    active: {
        type: Boolean,
        default: true
    }
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.__v

    return userObject
}

//Hash the plain text password before saving
userSchema.pre('save', async function (next) {
    const user = this

    if(user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
        user.tokens = []
    }

    next()
})

const userModel = mongoose.model('User', userSchema)

module.exports = userModel