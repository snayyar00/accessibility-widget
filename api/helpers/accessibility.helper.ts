const pa11y = require('pa11y');
const fs = require('fs');

interface axeOutput {
    message: string;
    context: string[];
    selectors: string[];
    impact: string;
    description: string;
    help: string;
}

interface htmlcsOutput {
    code: string;
    message: string;
    context: string[];
    selectors: string[];
}

interface finalOutput {
    axe: {
        errors: axeOutput[];
        notices: axeOutput[];
        warnings: axeOutput[];
    };
    htmlcs: {
        errors: htmlcsOutput[];
        notices: htmlcsOutput[];
        warnings: htmlcsOutput[];
    };
}

const output: finalOutput = {
    axe: {
        errors: [],
        notices: [],
        warnings: []
    },
    htmlcs: {
        errors: [],
        notices: [],
        warnings: []
    }
}

function createAxeArrayObj(message: string, issue: any) {
    const obj: axeOutput = {
        message: message,
        context: [issue.context],
        selectors: [issue.selector],
        impact: issue.runnerExtras.impact,
        description: issue.runnerExtras.description,
        help: issue.runnerExtras.help,
    }
    return obj;
}
function createHtmlcsArrayObj(issue: any) {
    const obj: htmlcsOutput = {
        code: issue.code,
        message: issue.message,
        context: [issue.context],
        selectors: [issue.selector],
    }
    return obj;
}

pa11y('tecqify.com', {
    includeNotices: true,
    includeWarnings: true,
    runners: [
        'axe',
        'htmlcs'
    ]
}).then((results: any) => {
    console.log(results)
    // const issueArray = results.issues.map((result:any) => {
    //     return {
    //         code: result.code,
    //         message: result.message,
    //         context: result.context
    //     }
    // })
    // results.issues = issueArray

    results.issues.forEach((issue: any) => {
        if (issue.runner === 'axe') {
            const message = issue.message.replace(/\s*\(.*$/, '');
            if (issue.type === 'error') {
                const errorIndex = output.axe.errors.findIndex(error => error.message === message);
                if (errorIndex === -1) {
                    const obj: axeOutput = createAxeArrayObj(message, issue);
                    output.axe.errors.push(obj);
                }
                else {
                    output.axe.errors[errorIndex].context.push(issue.context);
                    output.axe.errors[errorIndex].selectors.push(issue.selector);
                }
            }
            else if (issue.type === 'notice') {
                const noticeIndex = output.axe.notices.findIndex(notice => notice.message === message);
                if (noticeIndex === -1) {
                    const obj: axeOutput = createAxeArrayObj(message, issue);
                    output.axe.notices.push(obj);
                }
                else {
                    output.axe.notices[noticeIndex].context.push(issue.context);
                    output.axe.notices[noticeIndex].selectors.push(issue.selector);
                }
            }
            else if (issue.type === 'warning') {
                const warningIndex = output.axe.warnings.findIndex(warning => warning.message === message);
                if (warningIndex === -1) {
                    const obj: axeOutput = createAxeArrayObj(message, issue);
                    output.axe.warnings.push(obj);
                }
                else {
                    output.axe.warnings[warningIndex].context.push(issue.context);
                    output.axe.warnings[warningIndex].selectors.push(issue.selector);
                }
            }
        }
        else if (issue.runner === 'htmlcs') {
            if (issue.type === 'error') {
                const message = issue.message;
                const errorIndex = output.htmlcs.errors.findIndex(error => error.message === message);
                if (errorIndex === -1) {
                    const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
                    output.htmlcs.errors.push(obj);
                }
                else {
                    output.htmlcs.errors[errorIndex].context.push(issue.context);
                    output.htmlcs.errors[errorIndex].selectors.push(issue.selector);
                }
            }
            else if (issue.type === 'notice') {
                const noticeIndex = output.htmlcs.notices.findIndex(notice => notice.message === issue.message);
                if (noticeIndex === -1) {
                    const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
                    output.htmlcs.notices.push(obj);
                }
                else {
                    output.htmlcs.notices[noticeIndex].context.push(issue.context);
                    output.htmlcs.notices[noticeIndex].selectors.push(issue.selector);
                }
            }
            else if (issue.type === 'warning') {
                const warningIndex = output.axe.warnings.findIndex(warning => warning.message === issue.message);
                if (warningIndex === -1) {
                    const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
                    output.htmlcs.warnings.push(obj);
                }
                else {
                    output.htmlcs.warnings[warningIndex].context.push(issue.context);
                    output.htmlcs.warnings[warningIndex].selectors.push(issue.selector);
                }
            }
        }
    });

    console.log(output);

    const resultsString = JSON.stringify(results, null, 2); // format for readability
    fs.writeFile('newfile.txt', resultsString, (err: any) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log(`Results written to newfile.txt. Total issues: ${results.issues.length}`);
        }
    });
});
