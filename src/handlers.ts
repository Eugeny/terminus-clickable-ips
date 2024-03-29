import * as fs from 'fs/promises'
import * as path from 'path'
import * as untildify from 'untildify'
import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { PlatformService } from 'terminus-core'
import { BaseTerminalTabComponent } from 'terminus-terminal'

import { LinkHandler } from './api'

@Injectable()
export class URLHandler extends LinkHandler {
    regex = /\b((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)/

    // regex = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:\'".,<>?«»“”‘’]))/

    priority = 5

    constructor (private platform: PlatformService) {
        super()
    }

    handle (uri: string) {
        this.platform.openExternal(`http://${uri}`)
    }
}

export class BaseFileHandler extends LinkHandler {
    constructor (
        protected toastr: ToastrService,
        protected platform: PlatformService,
    ) {
        super()
    }

    async handle (uri: string) {
        try {
            await this.platform.openExternal('file://' + uri)
        } catch (err) {
            this.toastr.error(err.toString())
        }
    }

    async verify (uri: string): Promise<boolean> {
        try {
            await fs.access(uri)
            return true
        } catch {
            return false
        }
    }

    async convert (uri: string, tab?: BaseTerminalTabComponent): Promise<string> {
        let p = untildify(uri)
        if (!path.isAbsolute(p) && tab) {
            const cwd = await tab.session.getWorkingDirectory()
            if (cwd) {
                p = path.resolve(cwd, p)
            }
        }
        return p
    }
}

@Injectable()
export class UnixFileHandler extends BaseFileHandler {
    regex = /\/?([\w.~-]+)(\/[\w.~-]+)+/

    constructor (
        protected toastr: ToastrService,
        protected platform: PlatformService,
    ) {
        super(toastr, platform)
    }
}


@Injectable()
export class WindowsFileHandler extends BaseFileHandler {
    // Only absolute and home paths
    regex = /(([a-zA-Z]:|\\|~)\\[\w\-()\\\.]+|"([a-zA-Z]:|\\)\\[\w\s\-()\\\.]+")/

    constructor (
        protected toastr: ToastrService,
        protected platform: PlatformService,
    ) {
        super(toastr, platform)
    }

    convert (uri: string, tab?: BaseTerminalTabComponent): Promise<string> {
        const sanitizedUri = uri.replace(/"/g, '')
        return super.convert(sanitizedUri, tab)
    }
}
