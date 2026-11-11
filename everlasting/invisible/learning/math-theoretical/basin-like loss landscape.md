我们希望理解这样一种现象：LLM 沿许多随机参数方向移动时，原有能力可以保持不变；但沿某些 fine-tuning 方向移动很短的距离，就可能明显遗忘。论文把前一种稳定区域称为 basin，并尝试从随机扰动下的稳定性，推出任意方向上的性能保证。这里真正连接两者的工具是 randomized smoothing：我们不直接约束原始 benchmark 的变化，而是约束参数加上 Gaussian noise 后的平均 benchmark 分数。

设语言模型为 $f_\theta$，参数向量为 $\theta\in\mathbb R^d$，$d$ 是参数个数。固定一个非空 benchmark 数据集 $D$，用判断器 $O$ 给模型输出打分：回答正确或安全时为 $1$，否则为 $0$. 判断时需要的题目、参考答案和安全标准都视为评测规则的一部分。模型分数为

$$
S_{f,D}(\theta)
:=\mathbb E_{x\in D}\left[O\left(f_\theta(x)\right)\right]
=\frac{1}{|D|}\sum\limits_{x\in D}O\left(f_\theta(x)\right).
$$

这里 $x$ 是评测输入，$|D|$ 是样本数，$\mathbb E_{x\in D}$ 表示均匀抽取评测样本后的期望。若生成过程还包含随机采样，我们把该随机性也纳入分数的期望，使 $S_{f,D}$ 成为参数的确定函数。以下理论只要求 $S_{f,D}:\mathbb R^d\to[0,1]$ 可测，不要求它可微。原文也使用 $S_D$ 表示这一 benchmark 函数；涉及具体模型时，我们沿用 $S_{f,D}$ 的记法。

分数越大代表能力越好，论文画出的 loss 则越小越好。其变换 $T$ 是：在用于一幅图的分数集合中，记最小值和最大值为 $\mathrm{min\_val}$、$\mathrm{max\_val}$，当两者不同时，令

$$
T(s)=1-\frac{s-\mathrm{min\_val}}{\mathrm{max\_val}-\mathrm{min\_val}}.
$$

这里 $s$ 是待变换的 benchmark 分数。固定随机向量 $\delta\sim\mathcal N(0,I)$，沿该方向画出 $L(\alpha)=T\circ S_{f,D}(\theta+\alpha\delta)$，就得到 most-case landscape 的一条截面；$\alpha\in\mathbb R$ 控制移动尺度，$I$ 是 $d$ 维单位矩阵，$T\circ S_{f,D}$ 表示先算分数、再应用 $T$. Gaussian 向量的方向在单位球面上均匀分布，但它的长度并不固定。

这种图像描述的是生成结果的正确性或安全性，并不是训练时的 negative log-likelihood. 模型可以改变措辞、生成概率乃至具体推理过程，而最终答案仍然正确，因此 benchmark 不变并不要求模型函数本身不变。下面所有保证也都针对指定的 $D$；数学能力上的稳定性不自动意味着安全能力上的稳定性。

## Definition 4.1

给定噪声标准差 $\sigma>0$ 和可接受的平均分数下降 $\tau\geq0$，若

$$
S_{f,D}(\theta)
-\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[S_{f,D}(\theta+\epsilon)\right]
\leq\tau,
$$

我们就说 $f_\theta$ 在该 benchmark 上具有 $\sigma$-basin. 这里 $\epsilon\in\mathbb R^d$ 是参数噪声，每个坐标独立服从均值为 $0$、方差为 $\sigma^2$ 的 Gaussian distribution. 这个定义的实际含义是：随机扰动参数以后，模型的平均能力损失不超过 $\tau$.

注意，这个条件只限制平均下降，不是绝对差，也不是对每个扰动的逐点保证。如果一些方向使分数上升，另一些方向使分数下降，两者可以在期望中抵消。因此，单凭这个定义不能断言所有方向都稳定，也不能断言参数空间中存在一个同样大小、内部处处稳定的球。

@-原文把 $\tau\to0$ 与严格不下降的 basin 联系起来。要让这一步成立，我们需要更明确的条件：加噪后分数几乎处处不超过原分数，即

$$
S_{f,D}(\theta+\epsilon)\leq S_{f,D}(\theta)
\quad\text{几乎必然成立}.
$$

在此条件下，分数下降是非负随机变量。若 $\tau=0$，它的期望为 $0$，因此它几乎必然等于 $0$. 具体地，对任意 $a>0$，Markov 不等式给出

$$
\mathbb P\left(
S_{f,D}(\theta)-S_{f,D}(\theta+\epsilon)\geq a
\right)
\leq\frac{\tau}{a}.
$$

当 $\tau=0$ 时，对 $a=1,1/2,1/3,\ldots$ 分别应用此式，再取可数并，就得到分数下降严格为正的概率是 $0$. 当 $\tau>0$ 很小时，它只保证任意固定幅度的下降很少发生，不能直接推出“分数恰好不变”的概率很大。$\square$

如果绘图时的最大分数正好是 $S_{f,D}(\theta)$，分数保持不变才等价于 $T\circ S_{f,D}(\theta+\epsilon)=0$. 原文使用的严格 basin 统计量是在给定尺度 $\alpha$ 下的

$$
\mathbb E_{\delta\sim\mathcal N(0,I)}
\left[\mathbb I\left\{T\circ S_{f,D}(\theta+\alpha\delta)=0\right\}\right],
$$

这里 $\mathbb I\{\cdot\}$ 是事件成立时为 $1$、否则为 $0$ 的指示函数。这衡量固定尺度下的成功概率；若要断言整条径向线段都稳定，还需要检查线段内部，而不能只检查终点。

还有一个贯穿后文的尺度区别。由于各坐标方差相加，

$$
\mathbb E\left[\|\epsilon\|_2^2\right]
=\sum\limits_{j=1}^{d}\mathbb E\left[\epsilon_j^2\right]
=d\sigma^2.
$$

这里 $\epsilon_j$ 是第 $j$ 个噪声坐标，$\|\cdot\|_2$ 是 Euclidean norm. 因而 Gaussian 噪声的典型总长度约为 $\sigma\sqrt d$；后面的最坏方向保证却取决于参数移动距离除以 $\sigma$. 这两个尺度不能混用。-@

## Theorem 4.2

设 $S_{f,D}:\mathbb R^d\to[0,1]$ 可测，$\sigma>0$. Gaussian smoothing 后的分数是 $1/(\sqrt{2\pi}\sigma)$-Lipschitz，即对任意参数 $\theta_0,\theta_{sft}\in\mathbb R^d$，都有

$$
\left|
\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[S_{f,D}(\theta_{sft}+\epsilon)\right]
-\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[S_{f,D}(\theta_0+\epsilon)\right]
\right|
\leq\frac{\|\theta_{sft}-\theta_0\|_2}{\sqrt{2\pi}\sigma}.
$$

这里 $\theta_0$ 和 $\theta_{sft}$ 分别是 fine-tuning 前后的参数。所谓 $C$-Lipschitz，就是函数值之差的绝对值不超过输入距离的 $C$ 倍。因此，原文关心的性能下界为

$$
\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[S_{f,D}(\theta_{sft}+\epsilon)\right]
\geq
\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[S_{f,D}(\theta_0+\epsilon)\right]
-\frac{\|\theta_{sft}-\theta_0\|_2}{\sqrt{2\pi}\sigma}.
$$

我们先直接证明这个结论，以说明 Gaussian smoothing 为什么能够处理不连续的 benchmark；原文附录由强版本推出弱版本的推导放在下一项结论之后。

证明的关键是把“对模型求导”改成“对 Gaussian 密度求导”。定义密度

$$
q_\sigma(z)
=\frac{1}{(2\pi\sigma^2)^{d/2}}
\exp\left(-\frac{\|z\|_2^2}{2\sigma^2}\right),
\qquad z\in\mathbb R^d.
$$

对任意单位向量 $v\in\mathbb R^d$，即 $\|v\|_2=1$，有@-

$$
\begin{aligned}
v^\top\nabla_\theta
\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[S_{f,D}(\theta+\epsilon)\right]
&=v^\top\nabla_\theta
\int\limits_{\mathbb R^d}S_{f,D}(u)q_\sigma(u-\theta)\,du\\
&=\int\limits_{\mathbb R^d}S_{f,D}(u)
\frac{v^\top(u-\theta)}{\sigma^2}q_\sigma(u-\theta)\,du\\
&=\frac{1}{\sigma}
\mathbb E_{Z\sim\mathcal N(0,I)}
\left[S_{f,D}(\theta+\sigma Z)v^\top Z\right].
\end{aligned}
$$

-@-“这里的第二、三个等号再解释一下”这里 $u$ 是积分变量，$Z$ 是标准 Gaussian 向量，$\nabla_\theta$ 表示对参数求梯度。@-积分与求导可以交换：$S_{f,D}$ 有界，而 Gaussian 密度的一阶导数是一次多项式乘 Gaussian 密度；在 $\theta$ 的任意有界邻域内，都能用一个可积函数统一控制差商。这也说明，即使原分数不可微，平滑后的分数仍可微。-@-“从最原始的可交换条件出发来说明为什么可行”

令 $V=v^\top Z$，由 $\|v\|_2=1$ 可知 $V\sim\mathcal N(0,1)$. 要使最后一个期望尽量大，我们应该只保留 $V>0$ 的贡献。由于 $0\leq S_{f,D}\leq1$，

$$
\begin{aligned}
\mathbb E\left[S_{f,D}(\theta+\sigma Z)V\right]
&\leq\mathbb E\left[V\mathbb I\{V>0\}\right]\\
&=\frac{1}{\sqrt{2\pi}}
\int\limits_0^{+\infty}t\exp\left(-\frac{t^2}{2}\right)\,dt
=\frac{1}{\sqrt{2\pi}}.
\end{aligned}
$$

把 $v$ 换成 $-v$，得到方向导数的同样大小的下界。因此所有单位方向的方向导数绝对值都不超过 $1/(\sqrt{2\pi}\sigma)$，梯度范数也不超过这个数。

最后沿连接 $\theta_0$ 和 $\theta_{sft}$ 的线段积分。以 $t\in[0,1]$ 参数化这条线段，再用 Cauchy–Schwarz 不等式，得到

$$
\begin{aligned}
&\left|
\mathbb E_\epsilon\left[S_{f,D}(\theta_{sft}+\epsilon)\right]
-\mathbb E_\epsilon\left[S_{f,D}(\theta_0+\epsilon)\right]
\right|\\
&=\left|\int\limits_0^1
(\theta_{sft}-\theta_0)^\top
\nabla_\theta\mathbb E_\epsilon\left[S_{f,D}(\theta+\epsilon)\right]
\bigg|_{\theta=\theta_0+t(\theta_{sft}-\theta_0)}\,dt\right|\\
&\leq\int\limits_0^1
\|\theta_{sft}-\theta_0\|_2\frac{1}{\sqrt{2\pi}\sigma}\,dt
=\frac{\|\theta_{sft}-\theta_0\|_2}{\sqrt{2\pi}\sigma}.
\end{aligned}
$$

这里及后文未另行注明时，$\mathbb E_\epsilon$ 均指 $\epsilon\sim\mathcal N(0,\sigma^2I)$ 的期望。$\square$

这个定理不需要 basin 假设，也不需要知道 fine-tuning 使用了什么数据或优化器；它只看最终的参数距离。basin 的作用是确保起点的平滑分数仍然足够高。把 Definition 4.1 代入，就得到

$$
\mathbb E_\epsilon\left[S_{f,D}(\theta_{sft}+\epsilon)\right]
\geq S_{f,D}(\theta_0)-\tau
-\frac{\|\theta_{sft}-\theta_0\|_2}{\sqrt{2\pi}\sigma}.
$$

注意，这里保证的是加噪后的期望分数，并没有把左侧替换成未加噪的 $S_{f,D}(\theta_{sft})$. 随机邻域的平均表现好，仍允许个别参数点表现很差。

## Theorem 4.3

仍设 $S_{f,D}:\mathbb R^d\to[0,1]$ 可测，$\sigma>0$，$\theta_0,\theta_{sft}\in\mathbb R^d$. 设标准 Gaussian distribution 的累积分布函数为

$$
\Phi(x)=\frac{1}{\sqrt{2\pi}}
\int\limits_{-\infty}^{x}\exp\left(-\frac{s^2}{2}\right)\,ds,
\qquad x\in\mathbb R,
$$

其逆函数 $\Phi^{-1}:(0,1)\to\mathbb R$ 把概率转换为对应的 Gaussian 分位数。强版本的 randomized smoothing 保证为

$$
\mathbb E_\epsilon\left[S_{f,D}(\theta_{sft}+\epsilon)\right]
\geq
\Phi\left(
\Phi^{-1}\left(
\mathbb E_\epsilon\left[S_{f,D}(\theta_0+\epsilon)\right]
\right)
-\frac{\|\theta_{sft}-\theta_0\|_2}{\sigma}
\right).
$$

我们先考虑起点的平滑分数位于 $(0,1)$ 的情形。原文证明所用的 Lemma E.1 说明：对任意可测函数 $f:\mathbb R^d\to[0,1]$，只要平滑期望不取端点，函数

$$
x\longmapsto
\Phi^{-1}\left(
\mathbb E_{\epsilon\sim\mathcal N(0,I)}[f(x+\epsilon)]
\right)
$$

就是 $1$-Lipschitz. 这里 $f$ 是一般的有界函数，并非前面返回文本的语言模型。我们将在 Lemma E.1 中完整证明这个事实；它的含义是，平滑分数经过 Gaussian 分位数变换后，任意方向上的变化速度都不超过 $1$.

现在固定 $\sigma$，把这个引理应用于函数 $u\mapsto S_D(\sigma u)$. 通过变量缩放，

$$
\begin{aligned}
\Phi^{-1}\left(
\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}[S_D(\theta+\epsilon)]
\right)
&=\Phi^{-1}\left(
\mathbb E_{\epsilon\sim\mathcal N(0,I)}[S_D(\theta+\sigma\epsilon)]
\right)\\
&=\Phi^{-1}\left(
\mathbb E_{\epsilon\sim\mathcal N(0,I)}
\left[S_D\left(\sigma\left(\frac{\theta}{\sigma}+\epsilon\right)\right)\right]
\right).
\end{aligned}
$$

同一个表达式对 $\theta/\sigma$ 是 $1$-Lipschitz，对 $\theta$ 就是 $1/\sigma$-Lipschitz. 因此

$$
\Phi^{-1}\left(
\mathbb E_\epsilon[S_{f,D}(\theta_{sft}+\epsilon)]
\right)
\geq
\Phi^{-1}\left(
\mathbb E_\epsilon[S_{f,D}(\theta_0+\epsilon)]
\right)
-\frac{\|\theta_{sft}-\theta_0\|_2}{\sigma}.
$$

因为 $\Phi$ 严格递增，对两边应用 $\Phi$ 即得所需结论。

若某处的平滑分数为 $0$，由非负性和 Gaussian 密度处处为正可知，$S_{f,D}=0$ 在 Lebesgue 意义下几乎处处成立，因而所有参数处的平滑分数均为 $0$. 平滑分数为 $1$ 时，对 $1-S_{f,D}$ 应用同样的论证即可。因此端点情形也成立，只需把公式按极限理解。$\square$

为什么这个结果比弱版本更强？沿用原文的起点分数记法

$$
p_A:=\mathbb E_\epsilon[S_{f,D}(\theta_0+\epsilon)].
$$

对任意 $r\geq0$，$r$ 表示参数移动距离，有

$$
\begin{aligned}
p_A-\Phi\left(\Phi^{-1}(p_A)-\frac r\sigma\right)
&=\int\limits_{\Phi^{-1}(p_A)-r/\sigma}^{\Phi^{-1}(p_A)}\Phi'(s)\,ds\\
&\leq\frac{r}{\sqrt{2\pi}\sigma},
\end{aligned}
$$

因为 $\Phi'(s)=\exp(-s^2/2)/\sqrt{2\pi}\leq1/\sqrt{2\pi}$. 强版本保留了 Gaussian 密度沿整段区间的变化，弱版本则把它一律替换成最大值。

原文附录还从梯度角度进行比较。对内部取值的平滑分数，逆函数求导给出

$$
\begin{aligned}
\left\|\nabla_\theta
\Phi^{-1}\left(\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right)
\right\|_2
&=\frac{
\left\|\nabla_\theta\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right\|_2
}{
\Phi'\left(\Phi^{-1}\left(\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right)\right)
}
\leq\frac1\sigma,\\
\left\|\nabla_\theta\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right\|_2
&\leq\frac1\sigma
\Phi'\left(\Phi^{-1}\left(\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right)\right)
\leq\frac{1}{\sqrt{2\pi}\sigma}.
\end{aligned}
$$

再沿线段积分，就重新得到 Theorem 4.2. 注意，以上所有期望的噪声方差始终为 $\sigma^2I$；原文附录推导末尾写成 $I$ 的地方应保持这一方差。

当 $p_A$ 接近 $1$ 时，$\Phi'(\Phi^{-1}(p_A))$ 接近 $0$，所以高平滑分数附近的局部变化受到更强约束。但 $p_A$ 是加噪后的平均正确率或安全分数，不是某个回答的预测置信度，也不一定等于未加噪模型的分数。局部斜率上界在 $p_A=1/2$ 处最大，向 $0$ 或 $1$ 两端都减小；因此，原文关于“分数越低斜率越大”的说法只能在 $p_A\geq1/2$ 的区间内使用。

如果希望 fine-tuning 后的平滑分数至少为目标值 $q\in(0,p_A]$，由 $\Phi$ 的单调性可直接解出充分条件

$$
\|\theta_{sft}-\theta_0\|_2
\leq\sigma\left(\Phi^{-1}(p_A)-\Phi^{-1}(q)\right).
$$

在 $p_A$ 和 $q$ 固定时，可保证的半径与 $\sigma$ 成正比。这才是“扩大 basin 线性改善保证”的准确含义；分数下界本身对 $\sigma$ 的依赖是非线性的，而且实际增大噪声时 $p_A$ 也可能下降。

把这个保证与原模型联系起来，原文使用如下分解：

$$
\begin{aligned}
S_{f,D}(\theta_0)
-\mathbb E_\epsilon[S_{f,D}(\theta_{sft}+\epsilon)]
={}&S_{f,D}(\theta_0)
-\mathbb E_\epsilon[S_{f,D}(\theta_0+\epsilon)]\\
&+\mathbb E_\epsilon[S_{f,D}(\theta_0+\epsilon)]
-\mathbb E_\epsilon[S_{f,D}(\theta_{sft}+\epsilon)].
\end{aligned}
$$

第一项是起点对 Gaussian noise 的敏感性，由 basin 条件控制；第二项是平滑模型在 fine-tuning 中的变化，由定理控制。因此

$$
S_{f,D}(\theta_0)
-\mathbb E_\epsilon[S_{f,D}(\theta_{sft}+\epsilon)]
\leq\tau+p_A
-\Phi\left(\Phi^{-1}(p_A)-\frac{\|\theta_{sft}-\theta_0\|_2}{\sigma}\right).
$$

若 $p_A\to1$ 且 $\|\theta_{sft}-\theta_0\|_2/\sigma$ 保持有界，第二项趋于 $0$；第一项的正向下降也至多为 $1-p_A$，所以总下降的上界趋于 $0$. 这解释了为什么论文希望提高加噪后的模型表现。

注意，这仍然不是“旧任务分数高于新任务，就一定能够无遗忘地学会新任务”的证明。定理分别约束两个任务分数的变化幅度，没有提供一个能改善新任务且保留旧任务的共同参数方向，也没有保证某个优化器能够找到这样的方向。

## Theorem 4.4

设 $\theta\in\mathbb R^d$ 固定，$\epsilon\sim\mathcal N(0,\sigma^2I)$，$\sigma>0$，失败概率 $\delta\in(0,1)$. 额外假设原始 benchmark 函数 $S_{f,D}$ 关于参数全局 $L$-Lipschitz，其中 $L\geq0$，即

$$
|S_{f,D}(u)-S_{f,D}(v)|\leq L\|u-v\|_2,
\qquad u,v\in\mathbb R^d.
$$

则以至少 $1-\delta$ 的概率，

$$
S_{f,D}(\theta+\epsilon)
\geq\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]
-L\sigma\sqrt{2\log\frac1\delta}.
$$

这里 $\log$ 是自然对数。注意，本定理的 $L$ 是原始分数的 Lipschitz 常数，不能代入 Theorem 4.2 给出的平滑分数的常数。由 greedy decoding 和 $0$–$1$ 判断构造的分数可能发生跳变，未必存在有限的 $L$；此时前两个定理仍适用，但本定理不能直接用于保证单次加噪模型的表现。

证明采用 Gaussian concentration. 我们先说明其中使用的工具及其来源，避免把“集中在均值附近”当作未经解释的跳步。若 $Z\sim\mathcal N(0,I)$，$h:\mathbb R^d\to\mathbb R$ 是光滑有界函数，Gaussian log-Sobolev inequality 的一个形式是

$$
\operatorname{Ent}(e^{h(Z)})
\leq\frac12\mathbb E\left[e^{h(Z)}\|\nabla h(Z)\|_2^2\right],
$$

这里对正随机变量 $U$ 定义

$$
\operatorname{Ent}(U)
:=\mathbb E[U\log U]-\mathbb E[U]\log\mathbb E[U].
$$

这个量衡量 $U$ 偏离常数的程度；不等式说明，对 Gaussian 输入，梯度可以控制指数变换后的波动。下面给出所需形式的推导。

令 $u:\mathbb R^d\to(0,+\infty)$ 光滑、有界且有正下界。对 $t\geq0$ 定义 Gaussian averaging 算子

$$
P_tu(x)
:=\mathbb E_Z\left[u\left(e^{-t}x+\sqrt{1-e^{-2t}}Z\right)\right].
$$

这里 $x\in\mathbb R^d$，$t$ 控制保留多少原始输入：$t=0$ 时 $P_0u=u$，$t\to\infty$ 时 $P_tu(x)\to\mathbb E[u(Z)]$. 若 $x$ 本身也是独立的标准 Gaussian 向量，则括号中的线性组合仍是标准 Gaussian 向量，因而 $\mathbb E[P_tu(Z)]=\mathbb E[u(Z)]$.

逐坐标对 Gaussian 密度积分分部可得

$$
\mathbb E[Z_j a(Z)]=\mathbb E[\partial_j a(Z)],
$$

这里 $j\in\{1,\ldots,d\}$，$a$ 是使相关积分存在的光滑函数，$\partial_j$ 是第 $j$ 个偏导。对 $P_tu$ 直接求导，再用这一恒等式处理其中的 $Z_j$ 项，得到

$$
\partial_tP_tu=\mathcal L P_tu,
\qquad
\mathcal L a:=\Delta a-x^\top\nabla a,
\qquad
\nabla P_tu=e^{-t}P_t(\nabla u).
$$

这里 $\Delta a=\sum\limits_{j=1}^d\partial_j^2a$ 是 Laplacian，$\mathcal L$ 是上式定义的微分算子；$P_t$ 作用于向量时逐坐标取期望。例如，写 $s=\sqrt{1-e^{-2t}}$，对定义式求 $t$ 导数所得的两项分别是 $-e^{-t}x^\top\mathbb E[\nabla u]$ 和 $(e^{-2t}/s)\mathbb E[Z^\top\nabla u]$；Gaussian 积分分部把后一项变成 $e^{-2t}\mathbb E[\Delta u]$，恰好得到 $\mathcal LP_tu$.

相同的积分分部还给出 $\mathbb E[a(Z)\mathcal Lb(Z)]=-\mathbb E[\nabla a(Z)^\top\nabla b(Z)]$. 因此

$$
\begin{aligned}
\frac{d}{dt}\operatorname{Ent}(P_tu(Z))
&=\mathbb E\left[\left(1+\log P_tu(Z)\right)\mathcal LP_tu(Z)\right]\\
&=-\mathbb E\left[\frac{\|\nabla P_tu(Z)\|_2^2}{P_tu(Z)}\right].
\end{aligned}
$$

在期望内部对 $\nabla u=\sqrt u\,(\nabla u/\sqrt u)$ 使用 Cauchy–Schwarz 不等式，有

$$
\frac{\|\nabla P_tu\|_2^2}{P_tu}
\leq e^{-2t}P_t\left(\frac{\|\nabla u\|_2^2}{u}\right).
$$

当 $t\to\infty$ 时，$P_tu$ 趋于常数，熵趋于 $0$. 从 $0$ 积分到 $+\infty$，利用 Gaussian 分布在 $P_t$ 下不变，就得到

$$
\begin{aligned}
\operatorname{Ent}(u(Z))
&=\int\limits_0^{+\infty}
\mathbb E\left[\frac{\|\nabla P_tu(Z)\|_2^2}{P_tu(Z)}\right]dt\\
&\leq\int\limits_0^{+\infty}e^{-2t}\,dt\,
\mathbb E\left[\frac{\|\nabla u(Z)\|_2^2}{u(Z)}\right]
=\frac12\mathbb E\left[\frac{\|\nabla u(Z)\|_2^2}{u(Z)}\right].
\end{aligned}
$$

取 $u=e^h$，就得到前述 log-Sobolev inequality.

回到本定理，令 $F(z):=S_{f,D}(\theta+\sigma z)$，则 $F$ 是 $L\sigma$-Lipschitz. 先假设它光滑，定义中心化随机变量 $Y:=F(Z)-\mathbb E[F(Z)]$，以及对数矩母函数 $\psi(\lambda):=\log\mathbb E[e^{\lambda Y}]$，$\lambda\in\mathbb R$. 把 $h(z)=\lambda(F(z)-\mathbb E[F(Z)])$ 代入刚才的不等式，得到

$$
\lambda\psi'(\lambda)-\psi(\lambda)
\leq\frac{\lambda^2L^2\sigma^2}{2}.
$$

由于 $\psi(0)=\psi'(0)=0$，当 $\lambda>0$ 时，

$$
\frac{d}{d\lambda}\left(\frac{\psi(\lambda)}{\lambda}\right)
\leq\frac{L^2\sigma^2}{2}
\quad\Longrightarrow\quad
\psi(\lambda)\leq\frac{\lambda^2L^2\sigma^2}{2}.
$$

对 $-Y$ 做同样处理，便有 $\mathbb E[e^{-\lambda Y}]\leq\exp(\lambda^2L^2\sigma^2/2)$. 于是，对任意 $a>0$ 和 $\lambda>0$，Markov 不等式给出

$$
\begin{aligned}
\mathbb P(Y\leq-a)
&\leq e^{-\lambda a}\mathbb E[e^{-\lambda Y}]\\
&\leq\exp\left(-\lambda a+\frac{\lambda^2L^2\sigma^2}{2}\right).
\end{aligned}
$$

当 $L>0$ 时，取 $\lambda=a/(L^2\sigma^2)$ 使右边最小，得到

$$
\mathbb P(Y\leq-a)
\leq\exp\left(-\frac{a^2}{2L^2\sigma^2}\right).
$$

再取 $a=L\sigma\sqrt{2\log(1/\delta)}$，右边就等于 $\delta$. 当 $L=0$ 时函数为常数，结论直接成立。

若 $F$ 仅 Lipschitz 而不光滑，我们用一个支撑在半径为 $\eta>0$ 的球内、积分为 $1$ 的非负光滑核对它做卷积。所得光滑函数仍是 $L\sigma$-Lipschitz，且与 $F$ 的差处处不超过 $L\sigma\eta$. 令 $\eta\to0$，上述矩母函数界由有界收敛保留下来，再应用同样的 Markov 推导即可。$\square$

在本定理的额外假设成立时，把 $\theta$ 取为 $\theta_{sft}$，就能把 Theorem 4.3 的期望保证变成一次采样的保证：

$$
S_{f,D}(\theta_{sft}+\epsilon)
\geq
\Phi\left(\Phi^{-1}(p_A)-\frac{\|\theta_{sft}-\theta_0\|_2}{\sigma}\right)
-L\sigma\sqrt{2\log\frac1\delta}
$$

以至少 $1-\delta$ 的概率成立。这里损失的额外一项来自抽样波动，而不是 fine-tuning 本身。

## Theorem 4.5

现在我们把问题从改变参数转向改变输入。设词表大小为 $V$，embedding 维度为 $h$，embedding matrix 为 $W\in\mathbb R^{h\times V}$. 每个 token 用一个 one-hot 向量 $e\in\mathbb R^V$ 表示，$We\in\mathbb R^h$ 就是对应的 embedding. 设 $D'$ 由 $D$ 中的 $k$ 次 token 替换得到，替换集合记为

$$
C=\left\{(e_i,e_i')\right\}_{i=1}^{k}.
$$

这里 $i$ 索引替换位置，$e_i$ 与 $e_i'$ 分别是替换前后的 one-hot 向量。我们保持序列长度、位置对应关系和评测标准不变，只研究这些位置上的 embedding 变化。

原文给出的局部几何估计为

$$
\mathbb E_\epsilon[S_{f,D'}(\theta+\epsilon)]
\geq
\Phi\left(
\Phi^{-1}\left(\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right)
-\frac{\sqrt{\sum\limits_{i=1}^{k}\|We_i-We_i'\|_2^2}}{\sigma}
\right).
$$

注意，原文把这一结果定位为 heuristic，但使用了没有误差项的不等式。仅有上述 token 替换条件不足以证明这个不等式。要从参数空间的 Theorem 4.3 得到它，还必须补上输入扰动与参数扰动在加噪后的等价关系。

一个足够的附加条件是：存在不依赖于噪声样本的固定参数改变量 $\Delta\theta\in\mathbb R^d$，使

$$
\begin{gathered}
\|\Delta\theta\|_2
\leq\sqrt{\sum\limits_{i=1}^{k}\|We_i-We_i'\|_2^2},\\
S_{f,D'}(\theta+\epsilon)
\overset{\mathrm{distribution}}{=}
S_{f,D}(\theta+\Delta\theta+\epsilon),
\qquad\epsilon\sim\mathcal N(0,\sigma^2I).
\end{gathered}
$$

这里第二行表示两个随机分数具有相同分布。更强的逐噪声样本相等当然也足够。这一条件要求 token 替换不仅能在干净参数处等效实现，还要保留 smoothing 所使用的随机机制。

在这些附加条件下，证明非常直接。先由同分布得到期望相等，再应用 Theorem 4.3 和 $\Phi$ 的单调性：

$$
\begin{aligned}
\mathbb E_\epsilon[S_{f,D'}(\theta+\epsilon)]
&=\mathbb E_\epsilon[S_{f,D}(\theta+\Delta\theta+\epsilon)]\\
&\geq\Phi\left(
\Phi^{-1}\left(\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right)
-\frac{\|\Delta\theta\|_2}{\sigma}
\right)\\
&\geq\Phi\left(
\Phi^{-1}\left(\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]\right)
-\frac{\sqrt{\sum\limits_{i=1}^{k}\|We_i-We_i'\|_2^2}}{\sigma}
\right).
\end{aligned}
$$

这证明了补充条件后的结论。$\square$

我们再展开原文的 embedding 直觉，看清为什么这个条件不能省略。若被替换的原 token 两两不同，即 $e_i^\top e_j=0$ 对 $i\neq j$ 成立，定义

$$
\delta_W:=\sum\limits_{i=1}^{k}(We_i'-We_i)e_i^\top.
$$

这里 $\delta_W\in\mathbb R^{h\times V}$ 是只修改相应 embedding 列的参数扰动。由 one-hot 向量的正交性，

$$
\begin{aligned}
(W+\delta_W)e_j
&=We_j+\sum\limits_{i=1}^{k}(We_i'-We_i)e_i^\top e_j
=We_j',\\
\|\delta_W\|_F^2
&=\sum\limits_{i=1}^{k}\|We_i'-We_i\|_2^2.
\end{aligned}
$$

这里 $\|\cdot\|_F$ 是 Frobenius norm，即矩阵所有元素平方和的平方根；把 embedding 参数展平以后，它恰好是参数向量的 Euclidean norm. 若同一原 token 被多次替换为不同目标，一个共享的 embedding 列就无法同时实现这些要求。即使替换要求一致，修改这一列还会影响该 token 在其他输入位置或后续生成中的使用；若输入 embedding 与输出层共享参数，也会影响输出层。因此，匹配几个输入位置的 embedding 不等于已经匹配了整个生成过程。

加噪后还有另一层问题。用 $\epsilon_W$ 表示 $\epsilon$ 中对应 embedding matrix 的噪声块，则

$$
(W+\epsilon_W)e_i'
-\left(W+\delta_W+\epsilon_W\right)e_i
=\epsilon_W(e_i'-e_i).
$$

右边一般不为 $0$. 即使两边各个位置的边缘分布相同，重复 token 所造成的噪声共享关系也可能不同，从而使整条序列的联合分布不同。

一个简单例子可以直接说明原条件为何不够。考虑只含两个 token $A,B$ 的词表，标量 embedding matrix 为 $W=(0,a)$，其中 $a>0$. 对每个 embedding 参数独立加入方差 $\sigma^2$ 的 Gaussian noise，分别记为 $\epsilon_A,\epsilon_B$. 令 $D$ 只有序列 $(A,B)$，模型输出两个位置的 embedding，benchmark 在第一个 embedding 严格小于第二个时返回 $1$，否则返回 $0$. 因为 $\epsilon_A-\epsilon_B\sim\mathcal N(0,2\sigma^2)$，有

$$
\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)]
=\mathbb P(\epsilon_A<a+\epsilon_B)
=\Phi\left(\frac{a}{\sqrt2\sigma}\right).
$$

只把第一个 token 替换成 $B$，就得到 $D'$ 中的序列 $(B,B)$. 两个位置现在共享完全相同的 embedding 和噪声，因此

$$
\mathbb E_\epsilon[S_{f,D'}(\theta+\epsilon)]=0.
$$

但原式右侧为

$$
\Phi\left(\frac{a}{\sqrt2\sigma}-\frac a\sigma\right)>0,
$$

与左侧矛盾。这个例子满足分数属于 $[0,1]$、只有一次替换、embedding 距离为 $a$ 等原始条件，表明缺失的是随机机制的等价性，而不仅是 token 距离是否足够小。$\square$

如果我们改为直接在每个输入位置的连续 embedding 上独立加 Gaussian noise，那么拼接后的 embedding 向量受到的是固定平移，平移的 Euclidean norm 恰好为 $\sqrt{\sum\limits_{i=1}^{k}\|We_i-We_i'\|_2^2}$. 此时将 Theorem 4.3 应用于 embedding 空间，可以严格得到同形的公式。但这种输入空间 smoothing 与原文的参数空间 smoothing 是两个不同的随机模型。

原文还用 $W\delta_x=\delta_Wx$ 解释输入扰动和权重扰动的对应关系。这里 $x\in\mathbb R^V$ 是连续输入表示，$\delta_x\in\mathbb R^V$ 是输入变化。对我们采用的 $W\in\mathbb R^{h\times V}$ 的乘法约定，$W$ 映满 $\mathbb R^h$ 要求的是满行秩，而不是原文所说的满列秩。即使满行秩保证该线性方程存在连续解，也不保证解对应某个合法的 token 替换。因而这一步可以解释局部几何联系，却不能独自完成离散输入的认证。

对于原文讨论的安全判断，若 $D=\{x\}$ 只含一个输入，$D'=\{x_{adv}\}$ 是修改后的输入，并且前述附加条件成立，那么只要公式右侧大于 $1/2$，就能保证修改后的平滑平均安全分数大于 $1/2$. 这仍然是平均分数保证；单次生成是否安全，还需要相应的概率论证。

这些结论也说明了扩大 basin 的训练动机。原文提出 Gaussian-augmented Optimizer，直接优化加噪参数下的 negative log-likelihood：

$$
L_{train}(x,\theta)
=-\mathbb E_{\epsilon\sim\mathcal N(0,\sigma^2I)}
\left[\log p(x\mid\theta+\epsilon)\right].
$$

这里 $L_{train}$ 是训练损失，$x$ 是训练序列，$p(x\mid\theta+\epsilon)$ 是加噪模型赋给该序列的概率。每次采样参数噪声，在 $\theta+\epsilon$ 上计算梯度，再更新中心参数 $\theta$，就是对这个期望目标做随机优化。它把“邻域内仍要做好任务”写入训练目标。注意，该目标是 benchmark 的可微替代，降低它并不由上述定理自动推出每个 $0$–$1$ benchmark 都会提高；论文对此提供的是实验支持。

## Clopper–Pearson bound

应用这些定理之前，我们还需要知道起点的平滑分数究竟有多高。论文附录用 Clopper–Pearson bound 对 basin 做统计检验。它虽然没有单独编号，但提供了将实验采样结果接到理论保证上的一步。

设我们进行了 $n$ 次相互独立、成功概率同为 $p\in[0,1]$ 的 Bernoulli 试验，每次结果只取 $0$ 或 $1$. 用 $X$ 表示成功总数，则 $X\sim\operatorname{Binomial}(n,p)$；观察到的成功数记为 $x\in\{0,\ldots,n\}$. 对给定的总错误概率 $\gamma\in(0,1)$，构造区间 $[p_{lower},p_{upper}]$，使

$$
\mathbb P_p\left(p_{lower}(X)\leq p\leq p_{upper}(X)\right)
\geq1-\gamma.
$$

这里 $\mathbb P_p$ 表示真实成功概率为 $p$ 时重复采样的概率；端点是观测数据 $X$ 的函数。这个保证是“按此方法重复构造的区间至少有 $1-\gamma$ 的比例覆盖真实参数”，而不是把未知但固定的 $p$ 当作随机变量。

当 $0<x<n$ 时，端点由以下两条尾概率方程确定：

$$
\mathbb P_{p_{lower}}(X\geq x)=\frac\gamma2,
\qquad
\mathbb P_{p_{upper}}(X\leq x)=\frac\gamma2.
$$

它们的意思是：比下端点更小的成功概率，很难产生至少 $x$ 次成功；比上端点更大的成功概率，很难只产生至多 $x$ 次成功。

为写出端点，定义 Beta distribution 的累积分布函数

$$
I_{a,b}(z)
:=\frac{\int\limits_0^z t^{a-1}(1-t)^{b-1}\,dt}
{\int\limits_0^1 t^{a-1}(1-t)^{b-1}\,dt},
\qquad a,b>0,\quad z\in[0,1].
$$

这里 $a,b$ 是 Beta distribution 的两个形状参数，$I_{a,b}^{-1}$ 表示它的分位数函数，不是倒数。端点为

$$
p_{lower}=
\begin{cases}
0,&x=0,\\
I_{x,n-x+1}^{-1}\left(\dfrac\gamma2\right),&x>0,
\end{cases}
\qquad
p_{upper}=
\begin{cases}
I_{x+1,n-x}^{-1}\left(1-\dfrac\gamma2\right),&x<n,\\
1,&x=n.
\end{cases}
$$

我们先验证这些分位数确实解出了尾概率方程。对 $1\leq x\leq n$，二项分布的上尾为

$$
\mathbb P_p(X\geq x)
=\sum\limits_{j=x}^{n}\binom njp^j(1-p)^{n-j}.
$$

这里 $\binom nj=n!/(j!(n-j)!)$ 是二项式系数。对 $p$ 求导，利用 $j\binom nj=n\binom{n-1}{j-1}$ 和 $(n-j)\binom nj=n\binom{n-1}{j}$，相邻项抵消后剩下

$$
\frac{d}{dp}\mathbb P_p(X\geq x)
=\frac{n!}{(x-1)!(n-x)!}\,p^{x-1}(1-p)^{n-x}.
$$

这个导数就是 $I_{x,n-x+1}$ 的密度，因为反复积分分部可得

$$
\int\limits_0^1t^{x-1}(1-t)^{n-x}\,dt
=\frac{(x-1)!(n-x)!}{n!}.
$$

两者在 $p=0$ 都为 $0$，所以 $\mathbb P_p(X\geq x)=I_{x,n-x+1}(p)$. 同理，$\mathbb P_p(X\leq x)=1-I_{x+1,n-x}(p)$. 代入尾概率方程即得端点表达式。

接着证明覆盖率。固定真实参数 $p$；上尾概率随 $p$ 增大而增大，因此若观测值 $x$ 导致 $p_{lower}(x)>p$，必有 $\mathbb P_p(X\geq x)<\gamma/2$. 所有这样的 $x$ 组成一个右尾集合，记其中最小的整数为 $x_*$，则

$$
\mathbb P_p\left(p_{lower}(X)>p\right)
=\mathbb P_p(X\geq x_*)<\frac\gamma2.
$$

如果这个集合为空，该失败概率就是 $0$. 对上端点做对称论证，可得 $\mathbb P_p(p_{upper}(X)<p)\leq\gamma/2$. 最后用 union bound 将两种失败概率相加，得到区间不覆盖 $p$ 的概率不超过 $\gamma$. 离散取值可能使实际覆盖率高于 $1-\gamma$，这正是该方法通常较保守的原因。$\square$

对 soft basin，一次 Bernoulli 试验可以这样定义：独立采样一个 $\epsilon\sim\mathcal N(0,\sigma^2I)$，再独立均匀抽取一个输入 $x\in D$，用 $O(f_{\theta+\epsilon}(x))$ 作为结果。其成功概率恰好为

$$
p=\mathbb E_\epsilon[S_{f,D}(\theta+\epsilon)].
$$

因此，若观测得到 $S_{f,D}(\theta)-p_{lower}\leq\tau$，就能以不超过 $\gamma$ 的错误概率认证该 soft basin 条件。对严格 basin，一次试验则是独立采样 $\delta\sim\mathcal N(0,I)$，记录固定尺度下事件 $T\circ S_{f,D}(\theta+\alpha\delta)=0$ 是否成立；相应的 $p_{lower}$ 估计的是这一事件的概率。

注意，完整 benchmark 的平均分数通常不取 $0$ 或 $1$，不能直接当作 Bernoulli 观测；同一次参数噪声下的许多题目也可能因共享模型而相关，不能未经论证就算成独立试验。这是应用 Clopper–Pearson bound 必须落实的采样条件。

## Lemma E.1

设 $f:\mathbb R^d\to[0,1]$ 可测，且它既不是几乎处处为 $0$，也不是几乎处处为 $1$. 则对所有 $x\in\mathbb R^d$，平滑期望都属于 $(0,1)$，并且

$$
x\longmapsto
\Phi^{-1}\left(
\mathbb E_{\epsilon\sim\mathcal N(0,I)}[f(x+\epsilon)]
\right)
$$

是 $1$-Lipschitz.

注意，原文把值域写成了 $\mathbb R$，这遗漏了必要条件：例如 $f\equiv2$ 时，$\Phi^{-1}(\mathbb E[f])$ 根本没有实数意义。因此这里明确补上 $[0,1]$ 的值域，以及使逆函数取有限值的非退化条件。端点常数情形已经在 Theorem 4.3 中单独处理。

证明沿用 Theorem 4.2 中对 Gaussian 密度求导的方法，但这一次保留当前函数值的信息。固定 $x\in\mathbb R^d$ 和单位方向 $v\in\mathbb R^d$，令 $Z\sim\mathcal N(0,I)$、$V=v^\top Z\sim\mathcal N(0,1)$. 已知

$$
v^\top\nabla_x\mathbb E_Z[f(x+Z)]
=\mathbb E_Z[f(x+Z)V].
$$

弱版本只使用了 $0\leq f\leq1$，允许我们把所有正向的 $V$ 都选进来。现在 $f$ 的平均值已经固定，我们不能任意选择总量；要在固定总量下最大化与 $V$ 的乘积，就应优先选择 $V$ 最大的那些样本。这就是下面 half-space 构造的直觉。

定义阈值

$$
a:=-\Phi^{-1}\left(\mathbb E_Z[f(x+Z)]\right),
$$

则由 Gaussian 分布的对称性，

$$
\mathbb P(V\geq a)=1-\Phi(a)
=\mathbb E_Z[f(x+Z)].
$$

我们逐点比较 $f(x+Z)$ 与 $\mathbb I\{V\geq a\}$. 当 $V\geq a$ 时，前者至多为 $1$，所以它们之差非正，而 $V-a$ 非负；当 $V<a$ 时，它们之差非负，而 $V-a$ 为负。因此总有

$$
\left(f(x+Z)-\mathbb I\{V\geq a\}\right)(V-a)\leq0.
$$

两者期望相同，乘以常数 $a$ 的那部分恰好抵消，于是

$$
\begin{aligned}
\mathbb E_Z[f(x+Z)V]
&\leq\mathbb E[V\mathbb I\{V\geq a\}]\\
&=\frac1{\sqrt{2\pi}}\int\limits_a^{+\infty}
t\exp\left(-\frac{t^2}{2}\right)\,dt\\
&=\frac1{\sqrt{2\pi}}\exp\left(-\frac{a^2}{2}\right)\\
&=\Phi'\left(\Phi^{-1}\left(\mathbb E_Z[f(x+Z)]\right)\right).
\end{aligned}
$$

把 $v$ 换成 $-v$，便得到方向导数绝对值的同样上界。对全部单位方向取上确界，得到

$$
\left\|\nabla_x\mathbb E_Z[f(x+Z)]\right\|_2
\leq\Phi'\left(\Phi^{-1}\left(\mathbb E_Z[f(x+Z)]\right)\right).
$$

现在使用逆函数求导。由于 $\Phi'(s)>0$ 对所有有限的 $s$ 成立，

$$
\begin{aligned}
\left\|\nabla_x\Phi^{-1}\left(\mathbb E_Z[f(x+Z)]\right)\right\|_2
&=\frac{
\left\|\nabla_x\mathbb E_Z[f(x+Z)]\right\|_2
}{
\Phi'\left(\Phi^{-1}\left(\mathbb E_Z[f(x+Z)]\right)\right)
}
\leq1.
\end{aligned}
$$

沿任意两点 $x,y\in\mathbb R^d$ 之间的线段积分，就得到

$$
\left|
\Phi^{-1}\left(\mathbb E_Z[f(x+Z)]\right)
-\Phi^{-1}\left(\mathbb E_Z[f(y+Z)]\right)
\right|
\leq\|x-y\|_2.
$$

这完成了引理，也补齐了 Theorem 4.3 所依赖的关键工具。$\square$

## Gaussian 扰动的范数

原文附录比较了两种用于 landscape 可视化的定长约束：取长度 $\sqrt{\mathbb E[\|\mathcal N(0,I)\|_2^2]}$，或者取长度 $\mathbb E[\|\mathcal N(0,I)\|_2]$. 它们并不精确相同，但在高维下相对误差趋于 $0$.

令 $Z\sim\mathcal N(0,I)$，$R:=\|Z\|_2$. 由于 $\mathbb E[R^2]=d$，第一种长度是 $\sqrt d$. 由 Gaussian 密度的径向积分，$R$ 的密度为

$$
\frac{r^{d-1}e^{-r^2/2}}{2^{d/2-1}\Gamma(d/2)},
\qquad r>0,
$$

这里 $\Gamma(z):=\int\limits_0^{+\infty}t^{z-1}e^{-t}\,dt$，$z>0$，是 Gamma function. 密度中的归一化常数由代换 $t=r^2/2$ 得到，用同一代换计算一阶矩，有

$$
\mathbb E[R]
=\sqrt2\frac{\Gamma((d+1)/2)}{\Gamma(d/2)}.
$$

为了比较它与 $\sqrt d$，使用 Stirling 展开的对数形式

$$
\log\Gamma(z)
=\left(z-\frac12\right)\log z-z
+\frac12\log(2\pi)+\frac1{12z}+O(z^{-3}),
\qquad z\to+\infty.
$$

这里 $O(z^{-3})$ 表示余项的绝对值不超过某个常数乘 $z^{-3}$. 将 $z+1/2$ 和 $z$ 分别代入再相减，利用 $\log(1+1/(2z))=1/(2z)-1/(8z^2)+O(z^{-3})$，得到

$$
\begin{aligned}
\log\frac{\Gamma(z+1/2)}{\Gamma(z)}
&=\frac12\log z-\frac1{8z}+O(z^{-2}),\\
\frac{\Gamma(z+1/2)}{\Gamma(z)}
&=z^{1/2}\left(1-\frac1{8z}+O(z^{-2})\right),\\
\mathbb E[R]
&=\sqrt d\left(1-\frac1{4d}+O(d^{-2})\right),\\
\operatorname{Var}(R)
&=\mathbb E[R^2]-\mathbb E[R]^2
=\frac12+O(d^{-1}).
\end{aligned}
$$

因此两种平方尺度的差趋于 $1/2$，并不趋于 $0$，但相对差为

$$
\frac{\mathbb E[R^2]-\mathbb E[R]^2}{\mathbb E[R]^2}
=\frac{1}{2d}+O(d^{-2})\longrightarrow0.
$$

长度本身的差为 $1/(4\sqrt d)+O(d^{-3/2})$，相对差为 $1/(4d)+O(d^{-2})$. 这说明用两种方式为 worst-case 方向设定同等级别的长度，在高维下几乎等价。$\square$

这些计算也解释了为什么 Gaussian noise 常落在半径约为 $\sigma\sqrt d$ 的薄壳附近。但这并不能把 Theorem 4.3 的认证半径从 $O(\sigma)$ 提升成 $O(\sigma\sqrt d)$；前者处理任意固定方向的最坏移动，后者描述随机向量的典型长度。

## Proposition E.2

论文最后尝试回答：如果我们限制 fine-tuning 的参数位移，模型是否还有足够的表达能力学习新任务？其理论直觉来自 Neural Tangent Kernel，即 NTK. 对于宽度为 $m$ 的网络，NTK parameterization 通常在层输出中使用与宽度相关的缩放，例如 $1/\sqrt m$，使输出和梯度内积在 $m\to\infty$ 时保持非退化的尺度。在适当条件下，训练过程中网络的 Jacobian 变化很小，网络可以用起点附近的一阶展开描述，这就是 lazy training 的核心。

原命题称：使用 NTK parameterization 时，随着 $m\to\infty$，最小化 fine-tuning 损失 $L_{ft}$ 所需的参数更新 $\Delta\theta$ 趋于 $0$. 注意，原文没有明确采用何种范数，而后续推导使用的是整个参数向量的 Euclidean norm. 若据此把结论理解为 $\|\Delta\theta\|_2\to0$，它一般不成立。原文给出的最小范数解和 Taylor 余项估计可以证明下面的条件性结论，但还不足以证明原命题的绝对位移结论。

我们先明确这些估计所需的全部条件。考虑标量输出网络 $f(x;\theta)$，宽度为 $m$，参数 $\theta\in\mathbb R^p$，起点为 $\theta_0$；$p$ 是这一部分使用的参数个数记法，随 $m$ 改变。fine-tuning 数据为 $n$ 个输入和目标值 $(x_i,t_i)$，$i=1,\ldots,n$，采用平方损失

$$
L_{ft}(\theta)
:=\frac12\sum\limits_{i=1}^{n}\left(f(x_i;\theta)-t_i\right)^2.
$$

定义 Jacobian matrix $\Phi\in\mathbb R^{n\times p}$ 和目标残差向量 $\vec y\in\mathbb R^n$：

$$
\Phi_{ij}:=\frac{\partial f(x_i;\theta_0)}{\partial\theta_j},
\qquad
(\vec y)_i:=t_i-f(x_i;\theta_0).
$$

这里 $\theta_j$ 是第 $j$ 个参数。注意，本节沿用原文的 $\Phi$ 表示 Jacobian matrix，它不是前面的 Gaussian CDF；本节的 $\sigma:=\sigma_{min}(\Phi)$ 是 Jacobian 的最小奇异值，也不是 Gaussian noise 的标准差。

假设 $p\geq n$，且 $\Phi$ 满行秩，即 $\sigma>0$. 再假设存在半径 $r>0$，使

$$
\frac{\|\vec y\|_2}{\sigma}\leq r,
$$

并且对每个训练输入 $x_i$，梯度 $\nabla_\theta f(x_i;\theta)$ 在闭球 $\{\theta:\|\theta-\theta_0\|_2\leq r\}$ 内是 $\beta$-Lipschitz，其中 $\beta\geq0$. 最后一项条件限制网络在候选更新附近的弯曲程度，而不只是要求起点的梯度存在。

那么，起点处的线性化模型

$$
g_\theta(x)
:=f(x;\theta_0)
+\nabla_\theta f(x;\theta_0)^\top\Delta\theta,
\qquad\Delta\theta:=\theta-\theta_0,
$$

具有精确拟合训练目标的最小范数更新

$$
\widehat{\Delta\theta}
=\Phi^\top(\Phi\Phi^\top)^{-1}\vec y,
\qquad
\|\widehat{\Delta\theta}\|_2\leq\frac{\|\vec y\|_2}{\sigma}.
$$

在该更新处，原网络的每个训练输出满足

$$
\left|f(x_i;\theta_0+\widehat{\Delta\theta})-t_i\right|
\leq\frac{\beta\|\vec y\|_2^2}{2\sigma^2}.
$$

若各个初始目标残差一致有界，即 $|(\vec y)_i|\leq C$，其中 $C$ 是不随宽度变化的常数，那么 $\|\vec y\|_2\leq C\sqrt n$，以上两项分别为 $O(\sqrt n/\sigma)$ 和 $O(\beta n/\sigma^2)$. 在固定训练集上，后者趋于 $0$ 保证存在拟合误差趋于 $0$ 的候选参数；若还满足 $\|\vec y\|_2/\sigma\to0$，才由前一项进一步保证该候选更新的总范数趋于 $0$.

我们依次证明这些结论。对线性化模型，训练目标变成原文的最小二乘问题

$$
\min\limits_{\Delta\theta\in\mathbb R^p}
\frac12\|\Phi\Delta\theta-\vec y\|_2^2.
$$

因为 $\Phi$ 满行秩，$\Phi\Phi^\top$ 可逆，并且

$$
\Phi\left(\Phi^\top(\Phi\Phi^\top)^{-1}\vec y\right)=\vec y.
$$

所以这确实是一个零损失解。要证明它的范数最小，设 $\Delta\theta$ 是另一个零损失解，并定义 $z:=\Delta\theta-\widehat{\Delta\theta}$. 则 $\Phi z=0$，而 $\widehat{\Delta\theta}$ 位于 $\Phi^\top$ 的像空间。因此

$$
\begin{aligned}
\widehat{\Delta\theta}^{\top}z
&=\vec y^\top(\Phi\Phi^\top)^{-1}\Phi z=0,\\
\|\Delta\theta\|_2^2
&=\|\widehat{\Delta\theta}\|_2^2+\|z\|_2^2
\geq\|\widehat{\Delta\theta}\|_2^2.
\end{aligned}
$$

这同时说明最小范数解是唯一的。它也可以写成 $\Phi^+\vec y$，这里 $\Phi^+:=\Phi^\top(\Phi\Phi^\top)^{-1}$ 是满行秩情形的 Moore–Penrose pseudoinverse.

接着设 $\Phi=U\Sigma V^\top$ 是其薄 singular value decomposition，其中 $U\in\mathbb R^{n\times n}$ 为正交矩阵，$V\in\mathbb R^{p\times n}$ 的列向量两两正交且长度为 $1$，$\Sigma\in\mathbb R^{n\times n}$ 是对角元素均为正奇异值的对角矩阵。则 $\Phi^+=V\Sigma^{-1}U^\top$，故

$$
\begin{aligned}
\|\widehat{\Delta\theta}\|_2
&=\|\Phi^+\vec y\|_2
\leq\|\Phi^+\|_{op}\|\vec y\|_2
=\frac{\|\vec y\|_2}{\sigma}.
\end{aligned}
$$

这里对任意矩阵 $A$，$\|A\|_{op}:=\sup_{\|v\|_2=1}\|Av\|_2$ 是它的 operator norm，$v$ 遍历与 $A$ 的列数相同维度的单位向量；对 $\Phi^+$，该范数等于最大逆奇异值 $1/\sigma$. 这一估计的直觉是：如果 Jacobian 在每个训练输出方向上都能有效响应参数变化，就不需要特别大的参数位移来消除目标残差。仅有 $p\geq n$ 还不够，关键是不能有过小的奇异值。

然后估计线性化误差。取任意满足 $\|\Delta\theta\|_2\leq r$ 的参数改变量，以及一个满足上述梯度 Lipschitz 条件的输入 $x$. 整条线段 $\theta_0+t\Delta\theta$，$t\in[0,1]$，都留在该球内。由微积分基本定理，

$$
\begin{aligned}
&f(x;\theta_0+\Delta\theta)-g_{\theta_0+\Delta\theta}(x)\\
&=\int\limits_0^1
\left(\nabla_\theta f(x;\theta_0+t\Delta\theta)
-\nabla_\theta f(x;\theta_0)\right)^\top\Delta\theta\,dt,\\
&\left|f(x;\theta_0+\Delta\theta)-g_{\theta_0+\Delta\theta}(x)\right|\\
&\leq\int\limits_0^1\beta t\|\Delta\theta\|_2^2\,dt
=\frac\beta2\|\Delta\theta\|_2^2.
\end{aligned}
$$

这就是原文使用的 Taylor 余项估计，不需要在中间选择一个未知的 Hessian 取值点。将 $\Delta\theta=\widehat{\Delta\theta}$ 代入，由半径条件可知上述估计适用，又因为线性化模型在训练点满足 $g_{\theta_0+\widehat{\Delta\theta}}(x_i)=t_i$，所以

$$
\begin{aligned}
\left|f(x_i;\theta_0+\widehat{\Delta\theta})-t_i\right|
&\leq\frac\beta2\|\widehat{\Delta\theta}\|_2^2
\leq\frac{\beta\|\vec y\|_2^2}{2\sigma^2},\\
L_{ft}(\theta_0+\widehat{\Delta\theta})
&\leq\frac{n\beta^2\|\vec y\|_2^4}{8\sigma^4}.
\end{aligned}
$$

于是，对固定的 $n$ 和有界的残差，当 $\beta n/\sigma^2\to0$ 时，这个候选解的训练误差趋于 $0$. 若同时 $\|\vec y\|_2/\sigma\to0$，其参数总位移也趋于 $0$. 这完成了上述条件性结论的证明。$\square$

现在可以精确指出原命题的缺口。原文提出 $\beta/\sigma^2\propto1/\sqrt m\to0$，这控制的是 Taylor 余项，而不是 $\|\widehat{\Delta\theta}\|_2$. 即使这一缩放关系在某个具体网络和训练区域内成立，也可能只是 $\beta\to0$，而 $\sigma$ 仍保持常数量级；此时网络越来越线性，但完成新任务仍可能需要常数量级的总位移。该缩放关系本身也需要架构、初始化、数据和局部区域的假设，不能仅由“宽度为 $m$”推出。

一个带 $1/\sqrt m$ 输出缩放的线性网络就能展示这种区别。取单个训练输入和目标值 $1$，令

$$
f(x;\theta)=\frac1{\sqrt m}\sum\limits_{j=1}^{m}\theta_j,
\qquad\theta_0=0.
$$

这里输入 $x$ 固定，网络有 $m$ 个可训练分支参数；初始输出为 $0$，所以 $n=1$、$\vec y=(1)$. 其 Jacobian 为

$$
\Phi=\frac1{\sqrt m}(1,\ldots,1),
\qquad\Phi\Phi^\top=1,
\qquad\sigma=1,
\qquad\beta=0.
$$

最小范数更新是

$$
\widehat{\Delta\theta}
=\frac1{\sqrt m}(1,\ldots,1)^\top,
\qquad
\|\widehat{\Delta\theta}\|_2=1.
$$

每个坐标的更新都趋于 $0$，模型也从一开始就是精确线性的，但整个参数更新的 Euclidean norm 始终等于 $1$. 对任何其他精确拟合解，由 Cauchy–Schwarz 不等式，

$$
1=\left|\frac1{\sqrt m}\sum\limits_{j=1}^{m}\Delta\theta_j\right|
\leq\|\Delta\theta\|_2,
$$

所以也不存在总范数趋于 $0$ 的另一种拟合方式。$\square$

在通常的非退化 NTK 极限中，训练点上的 kernel matrix 正是 $\Phi\Phi^\top$；若它的最小特征值趋于一个正常数，$\sigma$ 就保持常数量级，而不是趋于无穷。因此更自然的结论通常是每个参数变化很小、参数位移相对于初始化的总体尺度很小，或者 Jacobian 变化很小。这些说法都需要与 $\|\Delta\theta\|_2\to0$ 区分。

此外，上面的最小范数解是一个候选终点。要证明实际 gradient descent 或其他优化器的整个轨迹都留在局部区域内，还需要沿轨迹控制 Jacobian、保证优化过程收敛，并控制步长。小的终点 Taylor 余项本身不能替代这些论证。

回到能力保留的问题，NTK 计算与 smoothing 保证的交接处应当是：先证明新任务存在或能够找到一个足够近的解，再将该解的真实参数距离代入 Theorem 4.3. 只有这个距离落入旧任务的认证半径，才能同时得到新任务的拟合与旧任务的平滑分数保证。原文提出的 Randomized Smoothing Regime 表达了这种期望，但尚未给出足以保证两者同时成立的一般定理。

原文最后还以 Rademacher complexity 讨论表达能力。对一组实值函数 $\mathcal H$ 和固定输入 $x_1,\ldots,x_n$，其经验 Rademacher complexity 定义为

$$
\widehat{\mathfrak R}_n(\mathcal H)
:=\mathbb E_{\xi}\left[
\sup\limits_{g\in\mathcal H}
\frac1n\sum\limits_{i=1}^{n}\xi_i g(x_i)
\right],
$$

这里 $\xi_1,\ldots,\xi_n$ 是独立、各以概率 $1/2$ 取 $-1$ 或 $1$ 的随机符号。这个量衡量函数集合与随机标签相关联的能力，数值取决于样本、函数输出尺度、网络结构及范数约束。它不是仅由参数个数决定的“可以学会多少任务”的计数。

注意，原文由 $O(d\sigma^2)\geq k$ 推出所需半径具有 $\sqrt{k/d}$ 的尺度。这里 $d$ 和 $\sigma$ 恢复为参数个数和 smoothing 的噪声标准差，$k$ 表示所需的复杂度水平，而不是前面的 token 替换数。这一步没有给出相应函数类的充分容量下界；即使已经证明容量的某个上界达到 $k$，也不能推出实际容量至少为 $k$，更不能推出指定的新任务能够被拟合。因此，“模型越大，在保留旧能力的局部区域内越可能容纳新能力”可以作为论文的研究动机，但不能由这段数量级运算当作已证结论。
