const taskService = require('./api/task/task.service')
const dbService = require('./services/db.service')

async function runWorker() {
    var delay = 5000
    try {
        const task = await taskService.getNextTask()
        if (task) {
            try {
                await taskService.performTask(task , true)
            } catch (err) {
                console.log(`Failed Task`, err)
            } finally {
                delay = 1
            }
        } else {
            console.log('Snoozing... no tasks to perform')
        }
    } catch (err) {
        console.log(`Failed getting next task to execute`, err)
    } finally {
        setTimeout(runWorker, delay)
    }
}

module.exports = {
    runWorker
}
