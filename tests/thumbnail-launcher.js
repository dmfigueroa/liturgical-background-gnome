import {exit, programArgs, programInvocationName} from 'system';
import {main} from '../src/main.js';

exit(await main([programInvocationName, ...programArgs]));
