import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as articleLockGETHandler from "../backend/router/article/lock/GET";
import * as articleLockPOSTHandler from "../backend/router/article/lock/POST";
import * as issueLockGETHandler from "../backend/router/issue/lock/GET";
import * as projectArticleSettingsGETHandler from "../backend/router/project/articleSettings/GET";
import * as projectArticleSettingsPOSTHandler from "../backend/router/project/articleSettings/POST";
import * as projectIssueSettingsGETHandler from "../backend/router/project/issueSettings/GET";
import * as projectIssueSettingsPOSTHandler from "../backend/router/project/issueSettings/POST";

export type ApiRouter = {
    article: {
        lock: {
            GET: ExtractRPCFromHandler<articleLockGETHandler.Handle>;
            POST: ExtractRPCFromHandler<articleLockPOSTHandler.Handle>;
        };
    };
    issue: {
        lock: {
            GET: ExtractRPCFromHandler<issueLockGETHandler.Handle>;
        };
    };
    project: {
        articleSettings: {
            GET: ExtractRPCFromHandler<projectArticleSettingsGETHandler.Handle>;
            POST: ExtractRPCFromHandler<projectArticleSettingsPOSTHandler.Handle>;
        };
        issueSettings: {
            GET: ExtractRPCFromHandler<projectIssueSettingsGETHandler.Handle>;
            POST: ExtractRPCFromHandler<projectIssueSettingsPOSTHandler.Handle>;
        };
    };
};
