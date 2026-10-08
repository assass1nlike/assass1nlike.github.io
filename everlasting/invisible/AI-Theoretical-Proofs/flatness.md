我们关心的问题是：两个 language model 已经同样准确地预测了被 mask 的 token，为什么它们的表示仍然可能有不同的 downstream performance？预训练目标只规定输出的条件概率，并没有唯一规定实现这些概率的内部表示。因此，除了最小化 pre-training loss，我们还需要理解 optimizer 在等价的最优解之间选择了什么。

论文用 population loss 的 Hessian trace 衡量 flatness：在局部极小点，Hessian 是半正定矩阵，其 trace 是所有参数方向上的曲率之和。这里“更平坦”始终指这个量更小。理论分成两部分：先研究 SGD 在最优解集合附近的长期运动，再研究一个括号语言中 flatness 与可迁移特征的关系。

## Lemma 4.2

设词表为 $\mathcal W=\{0,1,\ldots,c\}$，其中 $0$ 是 mask token，$c$ 是普通 token 的数量。句子 $x=[x_1,\ldots,x_T]$ 的长度为 $T$，位置 $t$ 独立、均匀地取自 $[T]=\{1,\ldots,T\}$，$x_{-t}$ 表示把第 $t$ 个 token 替换为 $0$ 的句子。参数 $\theta\in\mathbb R^d$ 包含模型的所有可训练参数；$f_\theta(x_{-t})\in\mathbb R^c$ 是预测的条件概率向量，其第 $j$ 个分量为 $[f_\theta(x_{-t})]_j$.

预训练使用 population cross-entropy loss

$$
L(\theta)=\mathbb E_{x,t}\left[-\log [f_\theta(x_{-t})]_{x_t}\right].
$$

我们假设模型能够准确表示真实条件概率，而且在考察的全局最优解集合 $\Gamma$ 上，

$$
f_\theta(x_{-t})=\Pr(\cdot\mid x_{-t}),\qquad \theta\in\Gamma.
$$

这个条件称为 saturation regime. 它不能只用“$\theta$ 是模型自身 loss 的全局最优解”来替代：如果模型无法表示真实分布，全局最优也未必满足它。我们还假设相关概率在求导的邻域内为正，模型输出足够光滑，并且可以交换求导与期望。固定有限词表和句长时，期望是有限求和，最后这个条件自动满足。

单个训练样本的随机梯度为 $-\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}$，其 covariance 为

$$
\begin{aligned}
\Sigma(\theta)
={}&\mathbb E_{x,t}\left[
\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}
\left(\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}\right)^\top
\right]\\
&-\nabla L(\theta)\nabla L(\theta)^\top.
\end{aligned}
$$

注意，梯度按列向量理解，covariance 中减去的是外积 $\nabla L(\theta)\nabla L(\theta)^\top$；原文定理陈述中这个乘积的次序写反了。

**命题。** 在上述条件下，对于任意 $\theta\in\Gamma$，

$$
\Sigma(\theta)=\nabla^2L(\theta).
$$

这个等式是 Bartlett identity 在这里的具体形式。它说明，训练样本引起的梯度噪声恰好与 loss 的曲率具有相同的方向和强度。

**证明。** 我们先固定 mask 后的上下文 $x_{-t}$ 和位置 $t$，只对被遮住的真实 token $x_t$ 取期望。对数求导给出

$$
\begin{aligned}
&\mathbb E_{x_t\mid t,x_{-t}}\left[-\nabla_\theta^2\log[f_\theta(x_{-t})]_{x_t}\right]\\
={}&-\sum\limits_{j=1}^{c}
\Pr(x_t=j\mid x_{-t})
\frac{\nabla_\theta^2[f_\theta(x_{-t})]_j}{[f_\theta(x_{-t})]_j}\\
&+\mathbb E_{x_t\mid t,x_{-t}}\left[
\frac{\nabla_\theta[f_\theta(x_{-t})]_{x_t}
\left(\nabla_\theta[f_\theta(x_{-t})]_{x_t}\right)^\top}
{[f_\theta(x_{-t})]_{x_t}^{,2}}
\right]\\
={}&-\nabla_\theta^2\sum\limits_{j=1}^{c}[f_\theta(x_{-t})]_j
+\mathbb E_{x_t\mid t,x_{-t}}\left[
\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}
\left(\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}\right)^\top
\right]\\
={}&\mathbb E_{x_t\mid t,x_{-t}}\left[
\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}
\left(\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}\right)^\top
\right].
\end{aligned}
$$

第三行到第四行使用了 saturation 条件，最后一步使用了概率之和恒为 $1$. 注意，我们只在当前参数处把真实概率与模型概率相等代入，不能把这个仅在最优解上成立的等式当作整个参数邻域内的恒等式去求导。

再对 $t,x_{-t}$ 取期望，左边变成 $\nabla^2L(\theta)$. 由于 $\theta$ 是可微函数的无约束极小点，$\nabla L(\theta)=0$，右边正好就是 $\Sigma(\theta)$. $\square$

这里两边也等于 conditional model 的 Fisher information matrix，即 log probability 的梯度外积的期望。这个解释有一个直接的意义：即使平均梯度已经为零，不同真实 token 的随机梯度仍然可能互不相同。因此 SGD 到达最优 population loss 后，仍然可能继续运动。

## Theorem 4.3

为了描述这种运动，我们需要明确最优解集合的几何结构。沿着一条全部由最优解组成的光滑曲线移动时，loss 不变；曲线的速度就是最优解集合的一个切向量。所有这样的速度组成切空间，垂直于切空间的方向组成法空间。

**Assumption 4.1.** $L$ 是 $C^3$ 函数，即三阶连续可微；$\Gamma\subseteq\mathbb R^d$ 是维数为 $d-M$ 的 $C^2$ submanifold，其中 $1\leq M\leq d$，并且

$$
\operatorname{rank}\nabla^2L(\theta)=M,\qquad \theta\in\Gamma.
$$

这个假设的含义是：最优解附近有 $d-M$ 个沿着最优解集合移动的自由方向，另外 $M$ 个方向具有严格正曲率。事实上，对任意经过 $\theta$ 的曲线 $\gamma(s)\subseteq\Gamma$，微分 $\nabla L(\gamma(s))=0$ 可得

$$
\nabla^2L(\theta)\gamma'(0)=0.
$$

于是切空间包含在 Hessian 的 kernel 中；两者维数都为 $d-M$，所以恰好相等。

原文用 $P_\Gamma^\perp$ 表示投影到切空间的正交投影，并定义 Riemannian gradient 为 $\nabla_\Gamma=P_\Gamma^\perp\nabla$. 注意，这里的上标 $\perp$ 沿用原文记法；该投影实际投向切空间，而不是法空间。对一个定义在参数空间上的标量函数，Riemannian gradient 就是把普通 gradient 的法向分量删掉，使移动方向留在约束集合 $\Gamma$ 上。

取固定初值 $\theta\in\Gamma$，学习率为 $\eta>0$，每一步重新独立抽取 $(x,t)$，定义 batch size 为 $1$ 的 SGD：

$$
\theta_0^\eta=\theta,\qquad
\theta_{k+1}^\eta
=\theta_k^\eta-\eta\nabla_\theta
\ell\left(f_{\theta_k^\eta}(x_{-t}),x_t\right),
\qquad
\ell\left(f_\theta(x_{-t}),x_t\right)
=-\log[f_\theta(x_{-t})]_{x_t}.
$$

这里 $k$ 是离散更新次数。除 Assumption 4.1 外，我们继续使用 Lemma 4.2 的 realizability 和光滑性条件。应用下面的随机过程极限定理还要求：在所考察轨迹附近，单样本 gradient 和所需导数局部有界，gradient flow 从某个邻域出发会收敛到 $\Gamma$，相应极限过程有唯一解。这些是引用长期 SGD 极限结果时需要的条件，不能仅由“平均 loss 是 $C^3$”替代。在有限样本类型、光滑正概率模型和正常稳定的最优解流形附近，可以局部满足这些要求。

**命题。** 定义 $\widehat\theta(t)$ 为下列 ODE 的解：

$$
\frac{\mathrm d\widehat\theta(t)}{\mathrm dt}
=-\frac14\nabla_\Gamma
\operatorname{Tr}\left[\nabla^2L(\widehat\theta(t))\right],
\qquad
\widehat\theta(0)=\theta.
$$

对任意使这条解在 $[0,K]$ 上存在的 $K>0$，当 $\eta\to0$ 时，

$$
\theta_{\lfloor K/\eta^2\rfloor}^\eta
\ \Longrightarrow\ \widehat\theta(K).
$$

这里 $\Longrightarrow$ 表示依分布收敛，$\lfloor\cdot\rfloor$ 用来把更新次数取整；极限是确定值时，这也等价于依概率收敛。

**证明。** 原文直接引用长期 SGD 极限定理。我们先说明这个工具提供什么，再把本题中特殊的 covariance 代进去。

设 $\Phi(z)$ 表示从邻域内参数 $z$ 出发，沿着 $\dot z=-\nabla L(z)$ 运行到收敛时得到的最优解。它把邻域中的点送回 $\Gamma$，但一般不是到流形的最近点投影。记 $D\Phi$ 和 $D^2\Phi$ 为一阶、二阶导数。对矩阵 $A\in\mathbb R^{d\times d}$，二阶导数与矩阵的 contraction 定义为

$$
D^2\Phi[A]
=\sum\limits_{i=1}^{d}\sum\limits_{j=1}^{d}
A_{ij}\,\partial_i\partial_j\Phi.
$$

这里 $i,j$ 是参数坐标指标。长期 SGD 极限定理说，在上述局部稳定性和正则条件下，把离散时间缩放为 $k\eta^2$，极限过程在 $\Gamma$ 上满足

$$
\mathrm d\widehat\theta
=D\Phi\,\Sigma^{1/2}\,\mathrm dW
+\frac12D^2\Phi[\Sigma],\mathrm dt.
$$

这里 $W$ 是 $d$ 维标准 Brownian motion，$\Sigma^{1/2}$ 是 covariance 的半正定平方根。第一项是保留下来的切向随机波动，第二项是法向波动经曲面和 gradient flow 的非线性作用产生的平均位移。这条极限定理是所引用的随机过程工具；下面的计算证明它在本题中恰好化成所述 ODE.

在 $\Gamma$ 上，$D\Phi=P_\Gamma^\perp$. 切向扰动已经位于最优解集合中，一阶不会被 gradient flow 改变；法向扰动会因严格正曲率而衰减，一阶最终位移为零。Lemma 4.2 给出 $\Sigma=\nabla^2L$，而 Hessian 的像空间是法空间，因此

$$
D\Phi\,\Sigma^{1/2}=0.
$$

于是极限中的 Brownian motion 项消失。剩下的任务是计算二阶项。为此，在当前参数处选取 Hessian 的单位特征向量 $v_1,\ldots,v_M$ 及其正特征值 $\lambda_1,\ldots,\lambda_M$.

沿着 gradient flow 运行一段时间不会改变最终收敛点，所以 $D\Phi(z)\nabla L(z)=0$. 在最优解处沿 $v_a$ 作二阶展开，得到

$$
2\lambda_a D^2\Phi[v_a,v_a]
=-P_\Gamma^\perp D^3L[v_a,v_a],
\qquad a\in[M].
$$

这里 $D^3L[v_a,v_a]$ 是一个向量，其第 $j$ 个分量是 $\sum\limits_{p=1}^{d}\sum\limits_{q=1}^{d}\partial_j\partial_p\partial_qL\,(v_a)_p(v_a)_q$. 上式中的系数 $2$ 来自分别对 $D\Phi$ 和 $\nabla L$ 求一次导数的两个相同交叉项；含有 $\nabla L$ 本身的项在最优解处为零。

我们还需要说明，为什么对法向特征向量求和可以换成对全部坐标求和。对任意单位切向量 $v$，选择 $\gamma(0)=\theta$、$\gamma'(0)=v$ 的流形内曲线。对 $\nabla L(\gamma(s))=0$ 再求一次导数可得

$$
D^3L[v,v]+\nabla^2L\,\gamma''(0)=0,
\qquad
P_\Gamma^\perp D^3L[v,v]=0.
$$

所以切向基向量对投影后的 contraction 没有贡献。由此

$$
\begin{aligned}
\frac12D^2\Phi[\Sigma]
&=\frac12\sum\limits_{a=1}^{M}
\lambda_aD^2\Phi[v_a,v_a]\\
&=-\frac14P_\Gamma^\perp
\sum\limits_{a=1}^{M}D^3L[v_a,v_a]\\
&=-\frac14P_\Gamma^\perp\nabla\operatorname{Tr}[\nabla^2L]\\
&=-\frac14\nabla_\Gamma\operatorname{Tr}[\nabla^2L].
\end{aligned}
$$

把它代入极限方程，就得到命题中的 ODE；再由所引用的 SGD 极限定理得到所述收敛。$\square$

这个结论的直接含义可以沿 ODE 求导看出来：

$$
\frac{\mathrm d}{\mathrm dt}
\operatorname{Tr}\left[\nabla^2L(\widehat\theta(t))\right]
=-\frac14
\left\|\nabla_\Gamma\operatorname{Tr}\left[\nabla^2L(\widehat\theta(t))\right]\right\|_2^2
\leq0.
$$

也就是说，pre-training loss 保持最优时，长期 SGD 的极限运动仍会减小 Hessian trace. 注意，这里证明的是沿流形下降，不是一定找到 trace 的全局最小点；$\eta^{-2}$ 的时间尺度也比通常的 gradient flow 时间尺度 $\eta^{-1}$ 更长。

若每一步平均 $B$ 个独立样本梯度，则独立噪声的交叉 covariance 为零，故

$$
\Sigma_B(\theta)=\frac1B\Sigma(\theta)=\frac1B\nabla^2L(\theta).
$$

同一计算把 ODE 中的 $1/4$ 改为 $1/(4B)$. 这解释了为什么这里无需人为添加 label noise：语言本身的条件不确定性已经提供了这种噪声。

## Theorem 6.1

接下来我们把“选择更平坦的解”与“学到什么特征”联系起来。这里换用了一个有限的括号语言，以及 squared loss；它不是前面 cross-entropy 定理的直接特例。

设 $T\geq6$ 为偶数。合法句子含有相同数量的左括号 $\langle$ 和右括号 $\rangle$，不额外要求每个 prefix 的括号数满足不等式。预训练分布 $\mathcal P$ 先均匀抽取一个这样的句子，再均匀选择一个位置 mask 掉。下游分布 $\mathcal P_{\mathrm{ds}}$ 则在全部 $T$ 个位置独立、均匀地抽取左右括号，不放入 mask.

目标 $g^*(x)$ 是可见右括号数量减去可见左括号数量。对预训练输入，这个数属于 $\{-1,1\}$，并唯一决定被遮住的括号；对下游输入，

$$
g^*(x)\in\{-T,-T+2,\ldots,T-2,T\}.
$$

令 $d=2T$，$e_t\in\mathbb R^{2T}$ 是第 $t$ 个标准基向量。位置 $t$ 的左括号编码为 $x_t=e_t$，右括号编码为 $x_t=-e_t$；如果位置 $t$ 被 mask，则独立、等概率地令 $x_t=e_{T+t}$ 或 $x_t=-e_{T+t}$. 前 $T$ 个坐标记录括号和位置，后 $T$ 个坐标记录 mask 的位置及其随机符号。因此

$$
g^*(x)
=-\left\langle\mathbf1_T,
\left[\sum\limits_{t=1}^{T}x_t\right]_{1:T}\right\rangle.
$$

这里 $\mathbf1_T$ 是 $T$ 维全 $1$ 向量，$[\cdot]_{1:T}$ 表示取前 $T$ 个坐标。

模型使用单个 attention head 和宽度为 $m$ 的 ReLU 层。设 query、key 矩阵为 $Q,K\in\mathbb R^{k\times d}$，其中 $k$ 是 query/key 维数；value 矩阵为 $V\in\mathbb R^{m\times d}$，输出权重为 $u\in\mathbb R^m$，并记 $\psi=(Q,K,V)$. 原文的 $V_i\in\mathbb R^d$ 表示 $V$ 第 $i$ 行的转置。我们只取第一个 token 对应的输出，因此

$$
\begin{aligned}
a_j&=\frac{\exp\left(\langle Qx_1,Kx_j\rangle\right)}
{\sum\limits_{r=1}^{T}\exp\left(\langle Qx_1,Kx_r\rangle\right)},\qquad j\in[T],\\
h_{Q,K}(x)&=\sum\limits_{j=1}^{T}a_jx_j,\\
f_{\psi,u}(x)&=\frac1m\sum\limits_{i=1}^{m}u_i\sigma\left(V_i^\top h_{Q,K}(x)\right),
\qquad \sigma(z)=\max\{z,0\}.
\end{aligned}
$$

这里 $a_j$ 是第一个 token 分配给位置 $j$ 的 attention weight，$h_{Q,K}(x)$ 是进入 ReLU 层的表示。预训练与下游 loss 分别是

$$
\begin{aligned}
L(\psi,u)
&=\mathbb E_{x\sim\mathcal P}\left[\left(f_{\psi,u}(x)-g^*(x)\right)^2\right],\\
\widehat L^{\mathcal P_{\mathrm{ds}}}(\psi,u)
&=\frac1n\sum\limits_{r=1}^{n}
\left(f_{\psi,u}(x^{(r)})-g^*(x^{(r)})\right)^2,\\
L^{\mathcal P_{\mathrm{ds}}}(\psi,u)
&=\mathbb E_{x\sim\mathcal P_{\mathrm{ds}}}
\left[\left(f_{\psi,u}(x)-g^*(x)\right)^2\right].
\end{aligned}
$$

这里 $x^{(1)},\ldots,x^{(n)}$ 是独立的下游训练样本。

**原命题。** 设 $m\geq2$，在所有满足 $L(\psi,u)=0$ 的解中，取 Hessian trace 最小的 $(\widehat\psi,\widehat u)$，再冻结 $\widehat\psi$，选择 minimum-norm interpolating head

$$
\widetilde u\in
\operatorname*{arg\,min}\limits_u\|u\|_2
\quad\text{subject to}\quad
\widehat L^{\mathcal P_{\mathrm{ds}}}(\widehat\psi,u)=0.
$$

原文声称，以至少 $1-2^{-n}$ 的概率有 $L^{\mathcal P_{\mathrm{ds}}}(\widehat\psi,\widetilde u)=0$.

注意，这个概率结论在上述分布下不成立。原证明还把下游的 $g^*(x)$ 当成只取 $\pm1$ 的变量，但 $T$ 为偶数时，下游标签甚至不可能等于 $\pm1$. 我们先给出一个完全显式的最平坦解，说明问题在哪里，再说明原证明想利用的迁移机制。

取 $m=2$、$Q=K=0$，因而所有 attention weight 都等于 $1/T$. 在证明中引入常数 $a=\sqrt m\,T^{3/4}$，令

$$
\begin{aligned}
V_1&=a[\mathbf1_T;\mathbf0_T],&
u_1&=-\frac a{\sqrt T},\\
V_2&=-a[\mathbf1_T;\mathbf0_T],&
u_2&=\frac a{\sqrt T}.
\end{aligned}
$$

这里 $[\cdot;\cdot]$ 表示向量纵向拼接，$\mathbf0_T$ 是 $T$ 维零向量。由 $\sigma(z)-\sigma(-z)=z$，对于预训练和下游的每个输入都有

$$
\begin{aligned}
f_{\psi,u}(x)
&=\frac a{m\sqrt T}
\left[
\sigma\left(\frac aTg^*(x)\right)
-\sigma\left(-\frac aTg^*(x)\right)
\right]\\
&=\frac{a^2}{mT\sqrt T}g^*(x)
=g^*(x).
\end{aligned}
$$

预训练输入上两个 preactivation 都非零，因此该处不存在 ReLU 求导歧义。下文 Lemma D.1 会证明，按照这里的 $1/m$ 输出归一化和没有 $1/2$ 的 squared loss，Hessian trace 的下界为 $4/(m\sqrt T)$；这个构造恰好达到该下界，所以确实是最平坦解。

现在只取一个下游样本，即 $n=1$. 如果它的标签为正，则只有第二个神经元激活，训练约束不涉及 $u_1$，minimum-norm 解必定令 $\widetilde u_1=0$. 它在所有负标签输入上输出 $0$，因而 population loss 严格为正。负标签样本的情况对称。如果唯一的训练样本标签为 $0$，两个特征都为零，minimum-norm 解是 $\widetilde u=0$，population loss 同样为正。因此成功概率为 $0$，与原文要求的至少 $1/2$ 矛盾。$\square$

这个反例中的表示其实已经是理想特征；失败来自下游样本没有识别两个独立输出系数。对于这种理想表示，我们可以把正确的迁移论证完整写出来。令

$$
I_+=\{i\in[m]:\widehat u_i>0\},\qquad
I_-=\{i\in[m]:\widehat u_i<0\}.
$$

假设冻结后的特征满足：存在各神经元的常数 $c_i>0$，使得对所有下游输入，

$$
\sigma\left(V_i^\top h_{Q,K}(x)\right)
=
\begin{cases}
c_i\sigma\left(g^*(x)\right),&i\in I_+,\\
c_i\sigma\left(-g^*(x)\right),&i\in I_-,\\
0,&i\notin I_+\cup I_-.
\end{cases}
$$

这表示所有神经元只重复编码括号数量差的正、负部分。这个条件在上面的两神经元构造中成立，但不能不加证明地从原文的全部等号条件推出；Lemma D.3 会具体处理这一点。

如果训练集中至少有一个正标签和一个负标签，零训练误差等价于

$$
\sum\limits_{i\in I_+}\widetilde u_i c_i=m,
\qquad
\sum\limits_{i\in I_-}\widetilde u_i c_i=-m.
$$

例如，对于任意正标签样本，把预测值与标签相等的方程除以非零的 $g^*(x)$，就得到第一个约束。由 Cauchy–Schwarz，满足第一个约束的最小范数向量必须平行于 $c_{I_+}$；第二个约束同理。因此

$$
\widetilde u_{I_+}=\frac{m c_{I_+}}{\|c_{I_+}\|_2^2},\qquad
\widetilde u_{I_-}=-\frac{m c_{I_-}}{\|c_{I_-}\|_2^2},\qquad
\widetilde u_{[m]\setminus(I_+\cup I_-)}=0.
$$

这里 $c_{I_+}$ 和 $c_{I_-}$ 分别由相应集合中的 $c_i$ 组成。代回模型得到

$$
\begin{aligned}
f_{\widehat\psi,\widetilde u}(x)
&=\frac1m\left[
\sum\limits_{i\in I_+}\frac{m c_i^2}{\|c_{I_+}\|_2^2}\sigma\left(g^*(x)\right)
-\sum\limits_{i\in I_-}\frac{m c_i^2}{\|c_{I_-}\|_2^2}\sigma\left(-g^*(x)\right)
\right]\\
&=\sigma\left(g^*(x)\right)-\sigma\left(-g^*(x)\right)
=g^*(x).
\end{aligned}
$$

所以在这个样本覆盖事件上，population loss 为零。设 $p_0$ 为下游标签等于零的概率，则

$$
p_0=\frac{\binom{T}{T/2}}{2^T},\qquad
\Pr\left(g^*(x)>0\right)
=\Pr\left(g^*(x)<0\right)=\frac{1-p_0}{2}.
$$

利用 inclusion–exclusion，训练集同时出现正、负标签的概率为

$$
1-2\left(\frac{1+p_0}{2}\right)^n+p_0^n.
$$

这里减去的两个事件分别是“没有正标签”和“没有负标签”，它们的交集是“全部为零标签”。这是上述理想特征下的准确成功概率，而不是 $1-2^{-n}$. $\square$

由此可以看清论文想表达的机制：学到数量差之后，下游只需识别极少数系数；但这个机制本身不能证明原文的概率界，也不能代替“每个最平坦解都具有这种特征”的结构性证明。

## 附录 B 中的两个辅助论证

在进入括号语言的引理之前，原文还给出了 Hessian trace 的估计方法，以及把小模型嵌入大模型的构造。它们虽然没有编号，但分别支撑了 flatness 的实验测量和不同模型规模之间的比较。

首先，由 Lemma 4.2 和 $\operatorname{Tr}(vv^\top)=\|v\|_2^2$，在 saturation regime 中，

$$
\operatorname{Tr}[\nabla^2L(\theta)]
=\mathbb E_{t,x_{-t}}
\mathbb E_{x_t\mid t,x_{-t}}
\left[\left\|\nabla_\theta\log[f_\theta(x_{-t})]_{x_t}\right\|_2^2\right].
$$

因此，我们可以先抽上下文，再从 $f_\theta(x_{-t})$ 中抽 token，计算 log probability 的 gradient norm 平方，最后取平均。由于此时模型条件分布就是真实条件分布，期望恰好等于上式，所以这是 unbiased estimator，无需显式构造高维 Hessian. $\square$

注意，离开 saturation regime 后，这种抽样仍然无偏估计模型自身的 Fisher trace，但一般不再无偏估计 population loss 的 Hessian trace；“接近 saturation”只能支持近似使用这个等式。

第二个论证先考虑普通 MLP. 设其深度为 $L$，第 $l$ 层宽度为 $d_l$，$W_l\in\mathbb R^{d_{l+1}\times d_l}$，并定义

$$
h_0(x)=x,\qquad
h_{l+1}(x)=\sigma(W_lh_l(x)),\qquad
f_{W,a}(x)=a^\top h_L(x).
$$

这里 $l\in\{0,\ldots,L-1\}$，$a\in\mathbb R^{d_L}$ 是输出权重，激活 $\sigma$ 为 ReLU 或 leaky ReLU，因此对任意 $r>0$ 有 $\sigma(rz)=r\sigma(z)$. 注意，本段 $L$ 表示层数，$a$ 表示输出权重，与前面各段的 loss 和构造常数分别在不同语境中使用。

保持输入维数不变，把各隐藏层宽度翻倍，取

$$
\widetilde W_0=\frac1{\sqrt2}
\begin{bmatrix}W_0\\W_0\end{bmatrix},\qquad
\widetilde W_l=\frac12
\begin{bmatrix}W_l&W_l\\W_l&W_l\end{bmatrix}
\quad(1\leq l\leq L-1),\qquad
\widetilde a=\frac1{\sqrt2}\begin{bmatrix}a\\a\end{bmatrix}.
$$

**命题。** 这个构造保持模型函数不变。

**证明。** 第一层由 positive homogeneity 直接给出 $\widetilde h_1(x)=2^{-1/2}[h_1(x);h_1(x)]$. 如果第 $l$ 层满足这个关系，则

$$
\begin{aligned}
\widetilde h_{l+1}(x)
&=\sigma\left(
\frac12\begin{bmatrix}W_l&W_l\\W_l&W_l\end{bmatrix}
\frac1{\sqrt2}\begin{bmatrix}h_l(x)\\h_l(x)\end{bmatrix}
\right)\\
&=\frac1{\sqrt2}\begin{bmatrix}h_{l+1}(x)\\h_{l+1}(x)\end{bmatrix}.
\end{aligned}
$$

归纳后得到

$$
f_{\widetilde W,\widetilde a}(x)
=\frac12[a^\top,a^\top]
\begin{bmatrix}h_L(x)\\h_L(x)\end{bmatrix}
=f_{W,a}(x).
$$

这说明较宽 MLP 确实包含实现同一函数的参数配置。$\square$

原文随后把复制参数的思路用于带有 LayerNorm 的 transformer. 对隐藏向量 $z\in\mathbb R^{d_h}$，设 $d_h$ 是 hidden size，理想化 LayerNorm 为

$$
\begin{aligned}
\mu(z)&=\frac1{d_h}\sum\limits_{j=1}^{d_h}z_j,\\
s^2(z)&=\frac1{d_h}\sum\limits_{j=1}^{d_h}\left(z_j-\mu(z)\right)^2,\\
\operatorname{LN}_{\gamma,\beta}(z)
&=\gamma\odot\frac{z-\mu(z)\mathbf1_{d_h}}{s(z)}+\beta.
\end{aligned}
$$

这里 $\gamma,\beta\in\mathbb R^{d_h}$ 是可训练的逐坐标缩放和偏置，$\odot$ 是逐元素乘法；我们假设 $s(z)>0$. 本式沿用原文没有数值稳定常数的理想化定义。

复制特征得到 $[z;z]$ 后，其均值和方差都不变；同时复制 $\gamma,\beta$，便有

$$
\operatorname{LN}_{[\gamma;\gamma],[\beta;\beta]}([z;z])
=[\operatorname{LN}_{\gamma,\beta}(z);\operatorname{LN}_{\gamma,\beta}(z)].
$$

对每个普通线性映射，把矩阵 $W_l$ 换成 $\frac12\left[\begin{smallmatrix}W_l&W_l\\W_l&W_l\end{smallmatrix}\right]$，就把复制的输入映射为复制的输出；偏置也复制。对 attention，每个 query、key、value 投影在两个输入副本上各取一半，再复制 attention head，所以每个 head 的 query、key、value 都与原来相同，attention score 因而相同。output projection 再平均两个 head 副本，就保持每个输出副本不变。由于输入激活值相同，这个论证不需要 GeLU 具有 positive homogeneity.

若输入 embedding 与输出矩阵共享参数 $W_E$，则采用原文的 $\widetilde W_E=\frac12[W_E;W_E]$. 入口处的理想化 LayerNorm 会消掉 $1/2$，得到复制的 hidden state；出口处有

$$
\widetilde W_E^\top[h_L(x);h_L(x)]
=\frac12[W_E^\top,W_E^\top]
[h_L(x);h_L(x)]
=W_E^\top h_L(x).
$$

因此，在这些理想化 LayerNorm 条件下，复制宽度和 head 的构造保持函数不变。$\square$

注意，原文进一步声称“把新 block 的 attention 和 MLP 输出矩阵置零，就能任意增加深度而保持函数不变”，但它写出的架构是 post-LayerNorm：

$$
v_l=\operatorname{LN}\left(h_l+\operatorname{Attn}_l(h_l)\right),\qquad
h_{l+1}=\operatorname{LN}\left(v_l+U_l\sigma(W_lv_l+b_l)\right).
$$

令 attention 输出为零且 $U_l=0$ 后，仍然得到 $v_l=\operatorname{LN}(h_l)$ 和 $h_{l+1}=\operatorname{LN}(v_l)$，一般不是 $h_l$. 例如标准 LayerNorm 把 $(2,-2)$ 变成 $(1,-1)$. 先前 block 还具有可训练的 $\gamma,\beta$，所以也不能默认其输出已经是新 LayerNorm 的不动点。原文关于任意增加深度的这段证明缺少必要条件。另一方面，函数保持不变本身也不蕴含所有新旧参数方向上的 Hessian trace 相等；要比较这个量，还需要相应的参数导数论证。

## Lemma D.1

我们回到 Theorem 6.1 的括号模型。令 $\theta=(Q,K,V,u)$ 表示全部参数，矩阵参数的 gradient norm 按 Frobenius norm 计算，即所有元素的平方和。仍令 $I_+=\{i:u_i>0\}$、$I_-=\{i:u_i<0\}$. 以下 $x$ 均取自预训练分布的支持集，并假设 $L(\psi,u)=0$.

为了使用普通 Hessian，我们先在模型关于参数可微且 loss 二阶可微的点进行计算；对非零输出权重的神经元，全部预训练输入上的 preactivation 非零就是一个充分条件。注意，ReLU 的零点不能通过随意规定 $\sigma'(0)=0$ 就变成普通意义下的光滑点。

**命题的系数修正。** 按照原文模型的 $f_{\psi,u}=m^{-1}u^\top\sigma(Vh_{Q,K})$ 和 $L=\mathbb E[(f-g^*)^2]$，正确下界为

$$
\operatorname{Tr}\left[\nabla_\psi^2L(\psi,u)\right]
+\operatorname{Tr}\left[\nabla_u^2L(\psi,u)\right]
\geq\frac4{m\sqrt T}.
$$

原文写成 $\sqrt{4/T}=2/\sqrt T$. 原计算一处遗漏了 squared loss 二阶求导的系数 $2$，另一处把模型 gradient 平方中的 $1/m^2$ 写成了 $1/m$；两处必须一起改正，不能只修改最后一个常数。

**证明。** Lemma D.4 会直接证明，在零 loss 处，Hessian trace 是 $2\mathbb E[\|\nabla_\theta f_{\psi,u}(x)\|_2^2]$. 我们先算出两个参数组的 gradient：

$$
\frac{\partial f_{\psi,u}(x)}{\partial u_i}
=\frac1m\sigma\left(V_i^\top h_{Q,K}(x)\right),\qquad
\nabla_{V_i}f_{\psi,u}(x)
=\frac1m u_i\mathbf1_{\{V_i^\top h_{Q,K}(x)>0\}}h_{Q,K}(x).
$$

这里 $\mathbf1_{\{\cdot\}}$ 是事件的 indicator，事件成立时为 $1$，否则为 $0$. 丢掉非负的 $Q,K$ gradient 项，再对每个激活神经元使用 $r^2+s^2\geq2rs$，可得

$$
\begin{aligned}
&\operatorname{Tr}\left[\nabla_\psi^2L(\psi,u)\right]
+\operatorname{Tr}\left[\nabla_u^2L(\psi,u)\right]\\
={}&2\mathbb E\left[
\|\nabla_Qf_{\psi,u}(x)\|_F^2
+\|\nabla_Kf_{\psi,u}(x)\|_F^2
+\|\nabla_Vf_{\psi,u}(x)\|_F^2
+\|\nabla_uf_{\psi,u}(x)\|_2^2\right]\\
\geq{}&\frac2{m^2}\mathbb E\left[
\sum\limits_{i=1}^{m}
\left(
\sigma\left(V_i^\top h_{Q,K}(x)\right)^2
+\|h_{Q,K}(x)\|_2^2u_i^2
\mathbf1_{\{V_i^\top h_{Q,K}(x)>0\}}
\right)\right]\\
\geq{}&\frac4{m^2}\mathbb E\left[
\|h_{Q,K}(x)\|_2
\sum\limits_{i=1}^{m}|u_i|\sigma\left(V_i^\top h_{Q,K}(x)\right)
\right]\\
\geq{}&\frac4{m^2}\mathbb E\left[
\|h_{Q,K}(x)\|_2
\left|\sum\limits_{i=1}^{m}u_i\sigma\left(V_i^\top h_{Q,K}(x)\right)\right|
\right]\\
={}&\frac4m\mathbb E\left[\|h_{Q,K}(x)\|_2|g^*(x)|\right]
\geq\frac4{m\sqrt T}.
\end{aligned}
$$

最后一步同时使用了两个事实。预训练标签满足 $|g^*(x)|=1$；而每个句子中的 $T$ 个 token encoding 两两正交、各自 norm 为 $1$，所以

$$
\|h_{Q,K}(x)\|_2^2
=\sum\limits_{j=1}^{T}a_j^2
\geq\frac1T\left(\sum\limits_{j=1}^{T}a_j\right)^2
=\frac1T.
$$

这里使用的是 Cauchy–Schwarz，等号恰好要求所有 $a_j=1/T$. $\square$

这串不等式也解释了 flatness 在惩罚什么。若许多正负输出互相抵消，最终预测可以很小，但各参数的 gradient norm 不会跟着抵消。为了得到同样的正确输出，这样的实现会增加 Hessian trace.

由于预训练支持集有限且每个输入的概率为正，上述每一步非负差值的期望为零，等价于每个输入上差值都为零。因此，在求导有效的范围内，达到下界需要且只需要以下四类条件同时成立：

1. 对每个预训练输入，$\nabla_Qf_{\psi,u}(x)=0$ 且 $\nabla_Kf_{\psi,u}(x)=0$.
2. 每个激活神经元满足

   $$
   V_i^\top h_{Q,K}(x)=|u_i|\|h_{Q,K}(x)\|_2.
   $$

3. 正、负输出权重的神经元不会在同一个输入上同时激活，即

   $$
   \sigma\left(V_i^\top h_{Q,K}(x)\right)
   \sigma\left(V_{i'}^\top h_{Q,K}(x)\right)=0,
   \qquad i\in I_+,\ i'\in I_-.
   $$

4. 每个预训练输入的 attention 都均匀，即 $a_j=1/T$.

第二项是 AM–GM 的等号条件，第三项是实数三角不等式的等号条件，第四项是 Cauchy–Schwarz 的等号条件。原文的式 (4) 把神经元输入写成了整段句子 $x$，维数不匹配，应使用 $h_{Q,K}(x)$. 在这里对称的支持集上，第三项也等价于对所有输入要求两个 preactivation 的乘积不大于零：同时为负会使取反后的输入上两者同时为正。

注意，原命题只列了后三项，但其证明第一步也要求 $Q,K$ gradient 为零。“attention 均匀”不能代替这个要求。例如取 $Q\ne0$、$K=0$，attention 仍均匀，但稍微扰动 $K$ 通常就会改变 attention 和模型输出，所以 $\nabla_Kf$ 未必为零。取 $Q=K=0$ 才能直接保证两个 gradient 都为零。

Theorem 6.1 中的两神经元构造满足全部四项；若 $m>2$，使用相同的 $a=\sqrt m\,T^{3/4}$，再令其余神经元的 $V_i,u_i$ 同时为零，也达到下界。这样的零神经元对零残差点处的 loss 没有二阶贡献。因此这个下界是可达到的。

## Fact D.2

下面两个事实只需要零预训练误差、均匀 attention 和无正负抵消条件。定义

$$
\begin{aligned}
D_+&=\{x\in\operatorname{supp}(\mathcal P):g^*(x)=1\},&
D_-&=\{x\in\operatorname{supp}(\mathcal P):g^*(x)=-1\},\\
H_+&=\{h_{Q,K}(x):x\in D_+\},&
H_-&=\{h_{Q,K}(x):x\in D_-\},\\
I_x&=\{i\in[m]:V_i^\top h_{Q,K}(x)>0\}.
\end{aligned}
$$

这里 $\operatorname{supp}(\mathcal P)$ 是预训练分布中概率为正的输入集合，$I_x$ 是输入 $x$ 激活的神经元集合。注意，原文把 $I_x$ 的索引范围写成 $[T]$，但神经元数量是 $m$，应为 $[m]$.

**命题。** 若同时满足 Lemma D.1 中的激活平衡条件，则

$$
x\in D_+\Longrightarrow I_x\subseteq I_+,
\qquad
x\in D_-\Longrightarrow I_x\subseteq I_-.
$$

此外，对每个 $V_i\ne0$，存在 $h\in H_+\cup H_-$ 使得 $V_i^\top h>0$.

**证明。** 假设 $x\in D_+$，则 $f_{\psi,u}(x)=1$. 由于 ReLU 输出非负，至少有一个正输出权重的神经元激活。无正负抵消条件禁止任何负输出权重的神经元同时激活。若一个 $u_i=0$ 的神经元激活，则激活平衡条件要求其严格正的 preactivation 等于 $|u_i|\|h_{Q,K}(x)\|_2=0$，矛盾。所以 $I_x\subseteq I_+$. 负标签的证明完全对称。

为证明第二部分，假设某个向量 $v\in\mathbb R^{2T}$ 对全部 $h\in H_+\cup H_-$ 都满足 $v^\top h\leq0$. 把所有括号和 mask 符号同时取反仍是合法预训练输入，均匀 attention 使对应特征变成 $-h$. 因此也有 $-v^\top h\leq0$，从而 $v^\top h=0$ 对所有这些特征成立。

现在证明这些特征张成整个 $\mathbb R^{2T}$. 固定 mask 位置 $r$，只改变 mask 的随机符号，两个特征之差为 $2e_{T+r}/T$，所以每个 mask 坐标方向都在张成空间中。消去这个坐标后，剩下 $T-1$ 个内容坐标，其中可取 $T/2$ 个 $+1/T$ 和 $T/2-1$ 个 $-1/T$. Lemma D.5 将证明，这样一个向量的 $T-1$ 个循环移位线性无关；因此除位置 $r$ 外的全部内容坐标方向也在张成空间中。再改变 $r$，便得到全部 $2T$ 个标准基方向。

所以 $v$ 与整个 $\mathbb R^{2T}$ 正交，只能是 $v=0$. 对 $v=V_i\ne0$ 应用这个结论，就知道它不可能在所有输入上都不激活。$\square$

## Lemma D.3

这个引理承担原证明最关键的结构性步骤：从“每个神经元在所有激活输入上取相同的值”，推出“它只编码括号数量差”。原文的陈述有三处需要先分清：下游标签不只取 $\pm1$；正输出权重应对应正预训练标签，不能与 Fact D.2 相反；不激活意味着 ReLU 输出为零，不意味着 preactivation 本身等于零。

即使修正这些表述，原证明中关于权重方向的推理仍不成立。它声称同一类中的 preactivation 不可能有的为零、有的为固定正值；下面的构造说明这种分裂完全可能，而且满足它使用的等号条件。

**等号条件不能推出原文的特征结构。** 取 $m=4$、$Q=K=0$，在本证明中令 $c=T^{3/4}$，并构造

$$
\begin{aligned}
V_1&=c[0,1,\ldots,1;1,0,\ldots,0],\\
V_2&=c[2,1,\ldots,1;-1,0,\ldots,0],\\
V_3&=-V_1,\qquad V_4=-V_2,\\
u_1&=u_2=-\frac{2c}{\sqrt T},\qquad
u_3=u_4=\frac{2c}{\sqrt T}.
\end{aligned}
$$

前后两组各有 $T$ 个坐标，分号前为内容权重，分号后为 mask 权重。

**验证。** 先考虑 $x\in D_-$，所以可见内容编码之和为 $1$. 如果 mask 在位置 $1$，则

$$
\left(V_1^\top h_{Q,K}(x),V_2^\top h_{Q,K}(x)\right)
=\left(\frac cT(1+\varepsilon),\frac cT(1-\varepsilon)\right),
\qquad \varepsilon\in\{-1,1\}.
$$

这里 $\varepsilon$ 是 mask 的随机符号。如果 mask 不在位置 $1$，设第一枚括号的编码符号为 $s_1\in\{-1,1\}$，则

$$
\left(V_1^\top h_{Q,K}(x),V_2^\top h_{Q,K}(x)\right)
=\left(\frac cT(1-s_1),\frac cT(1+s_1)\right).
$$

所以两个 preactivation 总是一个为 $0$、另一个为 $2c/T$. $V_3,V_4$ 的 preactivation 是它们的相反数，故只有一个负输出权重的神经元激活。该神经元的输出为

$$
\frac14\left(-\frac{2c}{\sqrt T}\right)\frac{2c}{T}
=-\frac{c^2}{T\sqrt T}=-1.
$$

对于 $D_+$，把特征取反就得到对称结论，模型输出为 $1$. 因此预训练 loss 为零。激活值也满足

$$
\frac{2c}{T}=|u_i|\|h_{Q,K}(x)\|_2,
$$

且没有正负抵消，attention 均匀，$Q,K$ gradient 为零。

然而，在下游取 $g^*(x)=-2$，即内容符号之和为 $2$. 第一枚括号的符号可以为 $1$，也可以为 $-1$；相应地，前两个神经元的 ReLU 特征分别为

$$
\frac cT(1,3)
\quad\text{或}\quad
\frac cT(3,1).
$$

标签相同，特征却不同；内容权重也明显不是全 $1$ 向量的倍数。这反驳了原证明从那些等号条件推出的结构结论。$\square$

注意，这个四神经元构造在一些预训练输入上恰好位于 ReLU 零点。因此它直接反驳的是原文所使用的等号条件蕴含关系；如果把 flatness 严格定义为普通 Hessian，还必须另外处理这些点的不可微性，不能把自动微分取 $\sigma'(0)=0$ 得到的量当作已经存在的 Hessian.

我们可以明确写出一个排除上述问题的条件，并证明在这个条件下原文想要的结构结论。假设每个非零神经元满足

$$
V_i^\top h_{Q,K}(x)\ne0
\qquad\text{对所有 }x\in\operatorname{supp}(\mathcal P),
$$

同时满足 Lemma D.1 的等号条件，且删除或置零全部不参与输出的神经元。在这个额外条件下，存在 $c_i>0$，使下游特征具有 Theorem 6.1 中所用的形式

$$
\sigma\left(V_i^\top h_{Q,K}(x)\right)
=
\begin{cases}
c_i\sigma\left(g^*(x)\right),&i\in I_+,\\
c_i\sigma\left(-g^*(x)\right),&i\in I_-.
\end{cases}
$$

**补充条件下的证明。** 考虑 $i\in I_-$. Fact D.2 禁止它在 $H_+$ 上激活。又因为 preactivation 非零，所以它在整个 $H_+$ 上严格为负；由 $H_-=-H_+$，它在整个 $H_-$ 上严格为正。激活平衡条件和 $\|h\|_2=1/\sqrt T$ 给出

$$
V_i^\top h=\frac{|u_i|}{\sqrt T},\qquad h\in H_-.
$$

把 $V_i$ 分成内容坐标 $V_i^{(c)}\in\mathbb R^T$ 和 mask 坐标 $V_i^{(p)}\in\mathbb R^T$. 固定 mask 位置 $r$ 及全部括号，只改变 mask 符号。两次内积相同，差值为 $2(V_i^{(p)})_r/T$，所以 $V_i^{(p)}=0$.

再固定 $r$，选两个不同的可见位置 $p,q$，在保持可见内容符号之和为 $1$ 的前提下交换这两处的 $+1,-1$. 内积仍相同，差值为

$$
\frac2T\left((V_i^{(c)})_p-(V_i^{(c)})_q\right)=0.
$$

$T\geq6$ 保证可以给其他位置补上所需数量的正负符号。对任意 $p,q$ 选择不等于它们的 $r$，便得全部内容坐标相同。因此 $V_i^{(c)}$ 是正的全 $1$ 向量倍数。$i\in I_+$ 的情况对称，内容坐标为负的全 $1$ 向量倍数。

还需要补上一个原证明没有展开的细节：预训练上的均匀 attention 为什么能延续到没有 mask 的下游？对内容坐标的任意 $j\ne1$，定义当前的标量 $A_{1j}=\langle Qe_1,Ke_j\rangle$，并令 $A_{11}=\langle Qe_1,Ke_1\rangle$. 在 mask 不位于 $1,j$ 的预训练句子中，均匀 attention 要求第一个和第 $j$ 个 logit 相等，即

$$
A_{11}=s_1s_jA_{1j}.
$$

这里 $s_1,s_j\in\{-1,1\}$ 是这两个位置的括号符号。我们可以分别选择 $s_1s_j=1$ 和 $s_1s_j=-1$ 的合法句子，所以 $A_{11}=A_{1j}=0$. 因此没有 mask 的下游输入上，第一个 query 与每个 key 的 logit 都为零，attention 仍然均匀。

于是对 $i\in I_-$，若 $V_i^{(c)}=Tc_i\mathbf1_T$，便有

$$
V_i^\top h_{Q,K}(x)
=-c_i g^*(x).
$$

对 $i\in I_+$ 同理得到 $c_i g^*(x)$. 取 ReLU 就得到所述特征形式。$\square$

这里新增的严格非零条件是实质性条件。它使“同一标签类中的部分输入激活、部分输入恰好为零”成为不可能，从而补上原证明真正缺失的一环；不能把这个补充后的结论写成原命题已经得到证明。

## Lemma D.4

**命题的系数修正。** 设 $\theta$ 为全部参数，$f_\theta(x)$ 为标量预测，$y$ 为样本标签。假设相关求导存在并能与期望交换，且

$$
L(\theta)=\mathbb E_x\left[\left(f_\theta(x)-y\right)^2\right]=0.
$$

则

$$
\operatorname{Tr}\left[\nabla_\theta^2L(\theta)\right]
=2\mathbb E_x\left[\|\nabla_\theta f_\theta(x)\|_2^2\right].
$$

注意，原文右边少了 $2$；只有把 loss 定义成 $\frac12\mathbb E[(f_\theta-y)^2]$ 时，才会得到原文写出的系数。

**证明。** squared loss 非负而期望为零，故 $f_\theta(x)=y$ 几乎处处成立。直接求导得到

$$
\begin{aligned}
\nabla_\theta L(\theta)
&=2\mathbb E_x\left[
\left(f_\theta(x)-y\right)\nabla_\theta f_\theta(x)
\right],\\
\nabla_\theta^2L(\theta)
&=2\mathbb E_x\left[
\nabla_\theta f_\theta(x)\nabla_\theta f_\theta(x)^\top
+\left(f_\theta(x)-y\right)\nabla_\theta^2f_\theta(x)
\right]\\
&=2\mathbb E_x\left[
\nabla_\theta f_\theta(x)\nabla_\theta f_\theta(x)^\top
\right].
\end{aligned}
$$

取 trace，再使用 $\operatorname{Tr}(vv^\top)=\|v\|_2^2$ 即得结论。$\square$

这个恒等式把参数空间中的二阶曲率，变成了预测对参数的一阶敏感程度。在零误差处，每个样本的残差都消失，因此 loss 的局部二阶变化完全来自预测的一阶变化。

## Lemma D.5

前面证明特征张成全部坐标空间时，用到了以下线性代数事实。

**命题。** 设 $k\geq1$ 为整数，$M\in\mathbb R^{(2k+1)\times(2k+1)}$ 的第一行为

$$
M_1=
[\underbrace{1,\ldots,1}_{k+1\text{ 个}},
\underbrace{-1,\ldots,-1}_{k\text{ 个}}].
$$

定义循环置换 $\rho(1)=2,\ldots,\rho(2k)=2k+1,\rho(2k+1)=1$，并令其余行满足

$$
M_{i,\rho(j)}=M_{i-1,j},\qquad
2\leq i\leq2k+1,\quad j\in[2k+1].
$$

这里 $M_i$ 表示第 $i$ 行，即每一行都是上一行向右循环移动一格。则 $\operatorname{rank}(M)=2k+1$.

**证明。** 第一行的正号占据从位置 $1$ 开始的连续 $k+1$ 个位置。把它向右循环移动 $k+1$ 格，得到的正号位置是 $k+2,\ldots,2k+1,1$. 两行的正号集合只在位置 $1$ 重合；其余位置一正一负。因此

$$
M_1+M_{\rho^{k+1}(1)}=2e_1^\top.
$$

对两边再同时循环移动 $i-1$ 格，便得到

$$
M_i+M_{\rho^{k+1}(i)}=2e_i^\top,
\qquad i\in[2k+1].
$$

这里 $e_i\in\mathbb R^{2k+1}$ 是标准基向量，$\rho^{k+1}$ 表示连续应用 $\rho$ 共 $k+1$ 次。每个标准基行向量都能由 $M$ 的两行线性表示，所以 $M$ 的行空间是整个 $\mathbb R^{2k+1}$，秩等于 $2k+1$. $\square$

这个构造的用意是利用正号比负号恰好多一个：适当移动后，所有坐标相消，只留下一个标准基方向。在括号模型中取 $2k+1=T-1$，就得到 Fact D.2 所需的满秩结论。

## Theorem D.6

前面的构造说明，直接提取括号数量差可以把预训练 loss 降到零。最后一个定理想说明另一个事实：即使 $V_i$ 完全随机，只要神经元足够多，调节输出权重也能把预训练 loss 降得很小。因此，低 pre-training loss 本身没有要求每个神经元都对齐那个人类可理解的方向。

**原命题。** 给定误差 $\epsilon>0$、失败概率 $\delta\in(0,1)$，令各行权重独立抽自 $V_i\sim\mathcal N(0,TI_{2T})$，其中 $I_{2T}$ 是 $2T$ 维单位矩阵。原文声称，当

$$
m\geq\widetilde O\left(2^T T^3\epsilon^{-2}\right),
$$

以至少 $1-\delta$ 的概率，存在使用这些随机特征的 $(\psi',u')$，使

$$
L(\psi',u')\leq\epsilon,
\qquad
\|u'\|_2^2\leq O\left(T^2\delta^{-1}\right).
$$

这里 $\widetilde O$ 表示省略对数因子的数量级，$O$ 中的常数应与 $m,T,\epsilon,\delta$ 无关；“使用这些随机特征”意味着 $V$ 保持抽样结果不变。原证明具体取 $Q=K=0$，所以 $\psi'=(0,0,V)$.

注意，原文的输出权重范数界与 $f=m^{-1}u^\top\sigma(Vh)$ 不一致。它构造 $u_i'=a(V_i)$，若每个 $a(V_i)$ 的二阶矩为 $O(T^2)$，自然得到的是 $\mathbb E\|u'\|_2^2=O(mT^2)$，不能少掉 $m$. 以下先验证这不是一个可以忽略的上界松紧问题，再给出保持原模型归一化的完整 random-feature 构造。

固定 $Q=K=0$，并令

$$
A(V)=\mathbb E_{x\sim\mathcal P}
\left[\sum\limits_{i=1}^{m}
\sigma\left(V_i^\top h_{Q,K}(x)\right)^2\right].
$$

这里 $A(V)$ 是全部随机特征在预训练输入上的总平方能量。因为 $\|h_{Q,K}(x)\|_2^2=1/T$，每个 $V_i^\top h_{Q,K}(x)$ 都是标准 normal 随机变量，所以

$$
\mathbb E_V A(V)=\frac m2.
$$

Markov inequality 给出 $\Pr(A(V)\leq2m)\geq3/4$. 对任意输出权重，由 Cauchy–Schwarz，

$$
\mathbb E_x[f_{\psi',u'}(x)^2]
\leq\frac{\|u'\|_2^2}{m^2}A(V).
$$

另一方面，若 $L(\psi',u')\leq\epsilon\leq1/4$，则对随机变量的 $L^2$ norm 使用三角不等式，得到

$$
\left(\mathbb E_x[f_{\psi',u'}(x)^2]\right)^{1/2}
\geq\left(\mathbb E_x[g^*(x)^2]\right)^{1/2}
-\left(\mathbb E_x[(f_{\psi',u'}(x)-g^*(x))^2]\right)^{1/2}
\geq1-\sqrt\epsilon\geq\frac12.
$$

因此在 $A(V)\leq2m$ 的事件上，任何这样的输出权重都满足

$$
\|u'\|_2^2\geq\frac m8.
$$

固定例如 $\delta=1/4$ 后，让 $m$ 任意增大，就不可能仍以 $3/4$ 的概率保持一个与 $m$ 无关的 $O(T^2)$ 范数上界。这说明原证明对应的固定随机特征构造确实需要修正。$\square$

即使允许重新选择 $Q,K$，也不能恢复一个对任意 $m$ 都成立的宽度无关范数界。因为 attention 是单位向量的 convex combination，始终有 $\|h_{Q,K}(x)\|_2\leq1$，所以全部特征的平方和至多为 $\sum\limits_{i=1}^{m}\|V_i\|_2^2$. 这个随机量的期望是 $2mT^2$，以至少 $3/4$ 的概率不超过 $8mT^2$. 在此事件上重复刚才的 Cauchy–Schwarz 推导，任何 loss 不超过 $1/4$ 的输出头都必须满足 $\|u'\|_2^2\geq m/(32T^2)$. 固定 $T$ 而增大 $m$，仍与原命题的宽度无关上界冲突。$\square$

对这里的线性计数目标，我们不需要经过原文的截断和对全部输入作 union bound，就可以直接证明如下版本：若

$$
m\geq\frac{2(2T^2+3)}{\delta\epsilon},
$$

则以至少 $1-\delta$ 的概率，存在 $\psi'=(0,0,V)$ 和 $u'$，满足

$$
L(\psi',u')\leq\epsilon,
\qquad
\|u'\|_2^2\leq\frac{8mT^2}{\delta}.
$$

这是针对本文具体目标、保持原有 $1/m$ 归一化的修正结论；它不是原文范数界的另一种写法。

**证明。** 取 $Q=K=0$，则

$$
h_{Q,K}(x)=\frac1T\sum\limits_{j=1}^{T}x_j,
\qquad
\|h_{Q,K}(x)\|_2=\frac1{\sqrt T},
\qquad
g^*(x)=-T[\mathbf1_T;\mathbf0_T]^\top h_{Q,K}(x).
$$

证明的思路是：先把目标写成随机 ReLU 特征的精确期望，再用 $m$ 个独立样本的平均值近似这个期望。

令 $v\sim\mathcal N(0,TI_{2T})$，定义依赖于随机特征的系数

$$
a(v)=-2[\mathbf1_T;\mathbf0_T]^\top v.
$$

由于 $v$ 与 $-v$ 同分布，且 $\sigma(z)-\sigma(-z)=z$，有

$$
\begin{aligned}
2\mathbb E_v\left[v\sigma(v^\top h)\right]
&=\mathbb E_v\left[v\left(\sigma(v^\top h)-\sigma(-v^\top h)\right)\right]\\
&=\mathbb E_v[vv^\top]h
=Th.
\end{aligned}
$$

因此，对任意固定 $h$，

$$
\mathbb E_v\left[\sigma(v^\top h)a(v)\right]
=-T[\mathbf1_T;\mathbf0_T]^\top h.
$$

同时

$$
\mathbb E_v[a(v)^2]
=4[\mathbf1_T;\mathbf0_T]^\top(TI_{2T})[\mathbf1_T;\mathbf0_T]
=4T^2.
$$

取 $u_i'=a(V_i)$，就得到 unbiased 的有限宽度近似

$$
f_{\psi',u'}(x)
=\frac1m\sum\limits_{i=1}^{m}
\sigma\left(V_i^\top h_{Q,K}(x)\right)a(V_i),
\qquad
\mathbb E_V[f_{\psi',u'}(x)]=g^*(x).
$$

还需要控制 approximation variance. 固定一个预训练输入，在本次矩计算中令

$$
X=v^\top h_{Q,K}(x),\qquad
Y=[\mathbf1_T;\mathbf0_T]^\top v.
$$

二者是均值为零的 jointly Gaussian 随机变量，且

$$
\mathbb E[X^2]=1,\qquad
\mathbb E[Y^2]=T^2,\qquad
\mathbb E[XY]=T[\mathbf1_T;\mathbf0_T]^\top h_{Q,K}(x)=-g^*(x).
$$

令 $\mu=\mathbb E[XY]\in\{-1,1\}$. 可以把 $Y$ 写为 $Y=\mu X+\sqrt{T^2-\mu^2}\,Z$，其中 $Z$ 是与 $X$ 独立的标准 normal 随机变量。利用标准 normal 的二阶矩为 $1$、四阶矩为 $3$，以及含奇数次 $Z$ 的项期望为零，得到

$$
\mathbb E[X^2Y^2]
=3\mu^2+(T^2-\mu^2)=T^2+2.
$$

又因为 $(X,Y)$ 与 $(-X,-Y)$ 同分布，$\sigma(X)^2Y^2$ 的期望恰好是 $X^2Y^2$ 的一半。于是

$$
\begin{aligned}
\mathbb E_v\left[\left(\sigma(X)a(v)\right)^2\right]
&=4\mathbb E[\sigma(X)^2Y^2]
=2T^2+4,\\
\operatorname{Var}_v\left(\sigma(X)a(v)\right)
&=2T^2+4-g^*(x)^2
=2T^2+3.
\end{aligned}
$$

独立平均使 variance 除以 $m$，而这个界对每个预训练输入都相同，所以

$$
\mathbb E_V[L(\psi',u')]=\frac{2T^2+3}{m}.
$$

再次使用 Markov inequality，

$$
\Pr_V\left(L(\psi',u')>\epsilon\right)
\leq\frac{2T^2+3}{m\epsilon}
\leq\frac\delta2.
$$

另一方面，$\mathbb E_V\|u'\|_2^2=4mT^2$，故

$$
\Pr_V\left(\|u'\|_2^2>\frac{8mT^2}{\delta}\right)
\leq\frac\delta2.
$$

两次失败事件的概率之和至多为 $\delta$，从而两个结论以至少 $1-\delta$ 的概率同时成立。$\square$

这个证明还避免了原文最后一段中的几处错误：用于控制 approximation error 的期望必须是平方误差，截断后保留的事件应是 norm 不超过阈值，应用 Chebyshev inequality 得到指定失败概率时也必须保留相应的 $\delta$ 因子。这里直接计算平方误差，既补全了概率估计，也避免把这些不一致带入结论。

注意，这个存在性结论只说明随机隐藏权重可以配合一个输出层得到很低的预训练 loss；它本身没有证明这种解的 downstream performance 必然差。

## Lemma D.7

原文用于支撑 random-feature 构造的工具，是把线性函数写成 Gaussian ReLU 特征的期望。在线性目标这个特例中，我们可以直接写出系数，无需把它作为没有展开的外部结论。

**命题。** 设 $h\in\mathbb R^{2T}$ 满足 $\|h\|_2=1/\sqrt T$，$v\sim\mathcal N(0,TI_{2T})$，并将原式中未注明维数的 $\mathbf1$ 解释为 $2T$ 维全 $1$ 向量。存在一个仅依赖于 $v$、不依赖于 $h$ 的随机系数 $a(v)$，使得对所有这样的 $h$ 同时有

$$
\mathbb E_v\left[\sigma(v^\top h)a(v)\right]
=-\sqrt T\,\mathbf1^\top h,
\qquad
\mathbb E_v[a(v)^2]=O(T^2).
$$

“同一个 $a(v)$ 对所有 $h$ 都有效”是这里的重要量词：如果系数还依赖于当前输入，就不能把它当成固定的输出层权重。

**证明。** 取

$$
a(v)=-\frac2{\sqrt T}\mathbf1^\top v.
$$

利用前面通过 $v\mapsto-v$ 的对称性证明的恒等式 $\mathbb E[v\sigma(v^\top h)]=Th/2$，可得

$$
\begin{aligned}
\mathbb E_v\left[\sigma(v^\top h)a(v)\right]
&=-\frac2{\sqrt T}\mathbf1^\top
\mathbb E_v\left[v\sigma(v^\top h)\right]\\
&=-\sqrt T\,\mathbf1^\top h,\\
\mathbb E_v[a(v)^2]
&=\frac4T\mathbf1^\top(TI_{2T})\mathbf1
=8T
\leq8T^2.
\end{aligned}
$$

这给出了所需系数及其二阶矩。$\square$

注意，这个抽象恒等式本身成立，但不能按原文的下一行直接认定预训练标签为 $-\sqrt T\,\mathbf1^\top h_{Q,K}(x)$. 在论文给出的 encoding 和平均 attention 下，正确目标是

$$
g^*(x)=-T[\mathbf1_T;\mathbf0_T]^\top h_{Q,K}(x).
$$

它既需要忽略 mask 坐标，也需要系数 $T$ 而不是 $\sqrt T$. Theorem D.6 中使用 $a(v)=-2[\mathbf1_T;\mathbf0_T]^\top v$，正是把这个期望表示方法应用到实际任务后的结果。
