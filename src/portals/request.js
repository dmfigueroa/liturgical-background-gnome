import Gio from 'gi://Gio';

export const PORTAL_NAME = 'org.freedesktop.portal.Desktop';
export const PORTAL_PATH = '/org/freedesktop/portal/desktop';

export function portalRequest(connection, {interfaceName, methodName, parameters, replyType,
    fdList = null, timeout = 30_000, handleToken}) {
    return new Promise((resolve, reject) => {
        const sender = connection.get_unique_name().slice(1).replaceAll('.', '_');
        let requestPath = `/org/freedesktop/portal/desktop/request/${sender}/${handleToken}`;
        let completed = false;
        let subscription;
        const subscribe = path => connection.signal_subscribe(PORTAL_NAME, 'org.freedesktop.portal.Request',
            'Response', path, null, Gio.DBusSignalFlags.NONE, (_connection, _sender, _path, _iface, _signal, params) => {
                if (completed) return;
                completed = true; connection.signal_unsubscribe(subscription);
                const [response, results] = params.deepUnpack();
                if (response === 0) resolve(results);
                else reject(new PortalError(response === 1 ? 'Portal request cancelled' : 'Portal request denied', response));
            });
        subscription = subscribe(requestPath);
        const callback = (source, result) => {
            try {
                const value = fdList ? source.call_with_unix_fd_list_finish(result)[0] : source.call_finish(result);
                const [returnedPath] = value.deepUnpack();
                if (returnedPath !== requestPath) {
                    connection.signal_unsubscribe(subscription); requestPath = returnedPath; subscription = subscribe(requestPath);
                }
            } catch (error) {
                completed = true; connection.signal_unsubscribe(subscription); reject(error);
            }
        };
        if (fdList) connection.call_with_unix_fd_list(PORTAL_NAME, PORTAL_PATH, interfaceName, methodName,
            parameters, replyType, Gio.DBusCallFlags.NONE, timeout, fdList, null, callback);
        else connection.call(PORTAL_NAME, PORTAL_PATH, interfaceName, methodName, parameters, replyType,
            Gio.DBusCallFlags.NONE, timeout, null, callback);
    });
}

export class PortalError extends Error {
    constructor(message, response) { super(message); this.response = response; }
}
