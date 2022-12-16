const dbService = require('../../services/db.service')
const externalService = require('./externalService')
const socketService = require('../../services/socket.service')
const logger = require('../../services/logger.service')
const utilService = require('../../services/util.service')
const ObjectId = require('mongodb').ObjectId

async function query(filterBy = { txt: '' }) {
    try {
        const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection('task')
        var tasks = await collection.find(criteria).toArray()
        return tasks
    } catch (err) {
        logger.error('cannot find tasks', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    var criteria = {}
    if (filterBy.txt) {
      const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
      criteria = { $or: [{ title: txtCriteria }, { description: txtCriteria }] }
    }  
    return criteria
  }

async function performTask(task) {
    try {
        // TODO: update task status to running and save to DB
        const id = task._id
        task.status = 'running'
        delete task._id
        socketService.emitTo({type:'setStatusToRunning' , data:id , label:null})
        task.triesCount++
        const collection = await dbService.getCollection('task')
        await collection.updateOne({ _id: ObjectId(id) }, { $set: {...task} })
        // TODO: execute the task using: externalService.execute
        task._id = id
        await externalService.execute(task)
        // TODO: update task for success (doneAt, status)
        task.status = 'success'
        task.doneAt = Date.now()
    } catch (error) {
        // TODO: update task for error: status, errors
        task.status = 'error'
        task.errors.unshift(error)
    } finally {
        // TODO: update task lastTried, triesCount and save to DB
        task.lastTriedAt = Date.now()
        const id = task._id
        delete task._id
        const collection = await dbService.getCollection('task')
        await collection.updateOne({ _id: ObjectId(id) }, { $set: {...task} })
        task._id = id
        return task
    }
}


async function getById(taskId) {
    try {
        const collection = await dbService.getCollection('task')
        const task = collection.findOne({ _id: ObjectId(taskId) })
        return task
    } catch (err) {
        logger.error(`while finding task ${taskId}`, err)
        throw err
    }
}

async function remove(taskId) {
    try {
        const collection = await dbService.getCollection('task')
        await collection.deleteOne({ _id: ObjectId(taskId) })
        return taskId
    } catch (err) {
        logger.error(`cannot remove task ${taskId}`, err)
        throw err
    }
}

async function add(task) {
    try {
        const collection = await dbService.getCollection('task')
        await collection.insertOne(task)
        return task
    } catch (err) {
        logger.error('cannot insert task', err)
        throw err
    }
}

async function update(task) {
    try {
        const taskToSave = {
            vendor: task.vendor,
            price: task.price
        }
        const collection = await dbService.getCollection('task')
        await collection.updateOne({ _id: ObjectId(task._id) }, { $set: taskToSave })
        return task
    } catch (err) {
        logger.error(`cannot update task ${task._id}`, err)
        throw err
    }
}


module.exports = {
    remove,
    query,
    getById,
    add,
    update,
    performTask
}
